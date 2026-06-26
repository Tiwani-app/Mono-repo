import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { requireActiveUser } from "./authz";
import { publishOrgAnnouncement } from "./activityNotifications";
import { db } from "./firebase";
import { stringField } from "./validation";

const notificationTypes = [
  "event",
  "finance",
  "vote",
  "general",
  "marketplace",
] as const;

type NotificationType = (typeof notificationTypes)[number];

const tokenDocId = (token: string) => createHash("sha256").update(token).digest("hex");

const notificationTypeField = (data: unknown): NotificationType => {
  const type = stringField(data, "type", { maxLength: 40 });
  if (!notificationTypes.includes(type as NotificationType)) {
    throw new HttpsError("invalid-argument", "Announcement type is invalid.");
  }
  return type as NotificationType;
};

const optionalStringField = (
  data: unknown,
  field: string,
  options: { maxLength?: number } = {},
): string => stringField(data, field, { ...options, required: false });

const deleteDisabledPushTokens = async (orgId?: string) => {
  let query = db.collection("device_tokens").where("disabled", "==", true);
  if (orgId) {
    query = query.where("orgId", "==", orgId);
  }
  const tokenSnapshot = await query.get();

  const chunkSize = 450;
  let deleted = 0;
  for (let index = 0; index < tokenSnapshot.docs.length; index += chunkSize) {
    const batch = db.batch();
    tokenSnapshot.docs.slice(index, index + chunkSize).forEach((doc) => {
      batch.delete(doc.ref);
      deleted += 1;
    });
    await batch.commit();
  }

  return deleted;
};

export const registerDeviceToken = onCall(async (request) => {
  const user = await requireActiveUser(request);
  const token = stringField(request.data, "token", { maxLength: 4096 });
  const platform = optionalStringField(request.data, "platform", {
    maxLength: 40,
  });
  const ref = db.collection("device_tokens").doc(tokenDocId(token));

  await ref.set(
    {
      disabled: false,
      orgId: user.profile.orgId,
      platform: platform || null,
      token,
      uid: user.uid,
      updatedAt: FieldValue.serverTimestamp(),
      registeredAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { ok: true };
});

export const sendAnnouncementPush = onCall(async (request) => {
  const user = await requireActiveUser(request, ["admin"]);
  const title = stringField(request.data, "title", { maxLength: 120 });
  const body = stringField(request.data, "body", { maxLength: 1000 });
  const type = notificationTypeField(request.data);
  return publishOrgAnnouncement({
    audit: {
      action: "announcement.push_sent",
      actorRole: user.profile.role,
      actorUid: user.uid,
    },
    body,
    orgId: user.profile.orgId,
    relatedDocId: null,
    sentBy: user.uid,
    target: null,
    title,
    type,
  });
});

export const cleanupInvalidPushTokens = onCall(async (request) => {
  const user = await requireActiveUser(request, ["admin"]);
  const deleted = await deleteDisabledPushTokens(user.profile.orgId);

  await db.collection("audit_logs").add({
    action: "push_tokens.cleaned",
    actorUid: user.uid,
    actorRole: user.profile.role,
    orgId: user.profile.orgId,
    targetPath: "device_tokens",
    details: { deleted },
    createdAt: FieldValue.serverTimestamp(),
  });

  return { deleted, ok: true };
});

export const cleanupDisabledPushTokens = onSchedule(
  {
    schedule: "every 24 hours",
    timeZone: "Africa/Lagos",
  },
  async () => {
    const deleted = await deleteDisabledPushTokens();
    await db.collection("audit_logs").add({
      action: "push_tokens.cleaned_scheduled",
      actorUid: "system",
      actorRole: "system",
      orgId: "system",
      targetPath: "device_tokens",
      details: { deleted },
      createdAt: FieldValue.serverTimestamp(),
    });
  },
);
