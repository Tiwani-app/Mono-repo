import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { BatchResponse, SendResponse } from "firebase-admin/messaging";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { requireActiveUser } from "./authz";
import { db, messaging } from "./firebase";
import { stringField } from "./validation";

const notificationTypes = [
  "event",
  "finance",
  "vote",
  "general",
  "marketplace",
] as const;

const invalidTokenCodes = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);

const tokenDocId = (token: string) =>
  createHash("sha256").update(token).digest("hex");

const notificationTypeField = (data: unknown) => {
  const type = stringField(data, "type", { maxLength: 40 });
  if (!notificationTypes.includes(type as typeof notificationTypes[number])) {
    throw new HttpsError("invalid-argument", "Announcement type is invalid.");
  }
  return type;
};

const optionalStringField = (
  data: unknown,
  field: string,
  options: { maxLength?: number } = {},
): string => stringField(data, field, { ...options, required: false });

const markInvalidTokens = async (
  response: BatchResponse,
  tokens: FirebaseFirestore.QueryDocumentSnapshot[],
) => {
  const batch = db.batch();
  let invalidCount = 0;
  response.responses.forEach((result: SendResponse, index: number) => {
    const code = result.error?.code;
    if (!code || !invalidTokenCodes.has(code)) {
      return;
    }
    invalidCount += 1;
    batch.update(tokens[index].ref, {
      disabled: true,
      invalidAt: FieldValue.serverTimestamp(),
      invalidReason: code,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  if (invalidCount > 0) {
    await batch.commit();
  }
  return invalidCount;
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
  const announcementRef = db.collection("announcements").doc();

  await announcementRef.set({
    notifId: announcementRef.id,
    orgId: user.profile.orgId,
    title,
    body,
    type,
    targetAudience: "all",
    target: null,
    relatedDocId: null,
    sentAt: FieldValue.serverTimestamp(),
    readBy: [],
    sentBy: user.uid,
  });

  const tokenSnapshot = await db
    .collection("device_tokens")
    .where("orgId", "==", user.profile.orgId)
    .where("disabled", "==", false)
    .get();
  const tokenDocs = tokenSnapshot.docs.filter((doc) => {
    const token = doc.data().token;
    return typeof token === "string" && token.trim();
  });

  let delivered = 0;
  let failed = 0;
  let invalidated = 0;
  const chunkSize = 500;
  for (let index = 0; index < tokenDocs.length; index += chunkSize) {
    const chunk = tokenDocs.slice(index, index + chunkSize);
    const response = await messaging.sendEachForMulticast({
      tokens: chunk.map((doc) => String(doc.data().token)),
      notification: { body, title },
      data: {
        announcementId: announcementRef.id,
        orgId: user.profile.orgId,
        type,
      },
    });
    delivered += response.successCount;
    failed += response.failureCount;
    invalidated += await markInvalidTokens(response, chunk);
  }

  await db.collection("audit_logs").add({
    action: "announcement.push_sent",
    actorUid: user.uid,
    actorRole: user.profile.role,
    orgId: user.profile.orgId,
    targetPath: announcementRef.path,
    details: {
      delivered,
      failed,
      invalidated,
      notifId: announcementRef.id,
      tokenCount: tokenDocs.length,
      type,
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  return {
    delivered,
    failed,
    invalidated,
    notifId: announcementRef.id,
    success: true,
  };
});

export const cleanupInvalidPushTokens = onCall(async (request) => {
  const user = await requireActiveUser(request, ["admin"]);
  const tokenSnapshot = await db
    .collection("device_tokens")
    .where("orgId", "==", user.profile.orgId)
    .where("disabled", "==", true)
    .get();

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
