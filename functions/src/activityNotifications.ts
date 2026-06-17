import { FieldValue } from "firebase-admin/firestore";
import { BatchResponse, SendResponse } from "firebase-admin/messaging";
import {
  FirestoreEvent,
  QueryDocumentSnapshot,
  onDocumentCreated,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { db, messaging } from "./firebase";

type NotificationType =
  | "event"
  | "finance"
  | "vote"
  | "general"
  | "marketplace";

type NotificationTarget =
  | { route: "event_detail"; eventId: string }
  | { route: "poll_vote"; pollId: string }
  | { route: "election_ballot"; electionId: string }
  | { route: "my_ledger"; memberId?: string }
  | { route: "marketplace" }
  | { route: "library" };

interface PublishOrgAnnouncementInput {
  body: string;
  orgId: string;
  relatedDocId?: string | null;
  sentBy?: string | null;
  target?: NotificationTarget | null;
  title: string;
  type: NotificationType;
  audit?: {
    action: string;
    actorRole?: string | null;
    actorUid?: string | null;
    details?: Record<string, unknown>;
  };
}

const invalidTokenCodes = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount);

const formatDateTime = (value: unknown) => {
  const date = toDate(value);
  return date
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date)
    : null;
};

const formatDateOnly = (value: unknown) => {
  const date = toDate(value);
  return date
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date)
    : null;
};

const toDate = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (value && typeof value === "object" && "toDate" in value) {
    const toDateMethod = (value as { toDate?: unknown }).toDate;
    if (typeof toDateMethod === "function") {
      const next = toDateMethod.call(value);
      return next instanceof Date && !Number.isNaN(next.getTime()) ? next : null;
    }
  }
  if (typeof value === "string" || typeof value === "number") {
    const next = new Date(value);
    return Number.isNaN(next.getTime()) ? null : next;
  }
  return null;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const stringValue = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const meaningfulFieldChanged = (
  beforeValue: unknown,
  afterValue: unknown,
): boolean => {
  if (beforeValue === afterValue) {
    return false;
  }
  const beforeDate = toDate(beforeValue);
  const afterDate = toDate(afterValue);
  if (beforeDate && afterDate) {
    return beforeDate.getTime() !== afterDate.getTime();
  }
  return JSON.stringify(beforeValue ?? null) !== JSON.stringify(afterValue ?? null);
};

const recordChanged = (
  beforeRecord: Record<string, unknown>,
  afterRecord: Record<string, unknown>,
  fields: readonly string[],
) => fields.some((field) => meaningfulFieldChanged(beforeRecord[field], afterRecord[field]));

const serializeTarget = (target: NotificationTarget | null | undefined) => {
  if (!target) {
    return null;
  }
  return target;
};

const messagingDataFor = (
  announcementId: string,
  orgId: string,
  type: NotificationType,
  target: NotificationTarget | null | undefined,
) => ({
  announcementId,
  orgId,
  type,
  ...(target
    ? Object.fromEntries(
        Object.entries(target).map(([key, value]) => [key, String(value)]),
      )
    : {}),
});

const markInvalidTokens = async (
  response: BatchResponse,
  tokens: QueryDocumentSnapshot[],
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

export const publishOrgAnnouncement = async (
  input: PublishOrgAnnouncementInput,
) => {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || !body || !input.orgId.trim()) {
    return null;
  }

  const announcementRef = db.collection("announcements").doc();
  await announcementRef.set({
    notifId: announcementRef.id,
    orgId: input.orgId,
    title,
    body,
    type: input.type,
    targetAudience: "all",
    target: serializeTarget(input.target),
    relatedDocId: input.relatedDocId ?? null,
    sentAt: FieldValue.serverTimestamp(),
    readBy: [],
    sentBy: input.sentBy ?? null,
  });

  const tokenSnapshot = await db
    .collection("device_tokens")
    .where("orgId", "==", input.orgId)
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
      data: messagingDataFor(announcementRef.id, input.orgId, input.type, input.target),
    });
    delivered += response.successCount;
    failed += response.failureCount;
    invalidated += await markInvalidTokens(response, chunk);
  }

  if (input.audit) {
    await db.collection("audit_logs").add({
      action: input.audit.action,
      actorUid: input.audit.actorUid ?? null,
      actorRole: input.audit.actorRole ?? null,
      orgId: input.orgId,
      targetPath: announcementRef.path,
      details: {
        delivered,
        failed,
        invalidated,
        notifId: announcementRef.id,
        tokenCount: tokenDocs.length,
        type: input.type,
        ...(input.audit.details ?? {}),
      },
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  return {
    delivered,
    failed,
    invalidated,
    notifId: announcementRef.id,
    success: true,
  };
};

const eventTarget = (
  eventId: string,
  status: string | null,
): NotificationTarget | null =>
  status === "draft" ? null : { route: "event_detail", eventId };

const eventBody = (
  data: Record<string, unknown>,
  action: "created" | "updated",
) => {
  const dateTime = formatDateTime(data.startTime);
  const location = stringValue(data.location);
  const status = stringValue(data.status);
  const segments = [
    action === "created"
      ? "A new event is available."
      : "An event was updated.",
    dateTime ? `When: ${dateTime}.` : null,
    location ? `Where: ${location}.` : null,
    status ? `Status: ${status}.` : null,
  ].filter(Boolean);
  return segments.join(" ");
};

const eventReminderBody = (
  data: Record<string, unknown>,
  reminderType: "day" | "hour",
) => {
  const dateTime = formatDateTime(data.startTime);
  const location = stringValue(data.location);
  const segments = [
    reminderType === "day"
      ? "Reminder: this event starts tomorrow."
      : "Reminder: this event starts in about 1 hour.",
    dateTime ? `When: ${dateTime}.` : null,
    location ? `Where: ${location}.` : null,
  ].filter(Boolean);
  return segments.join(" ");
};

const reminderFieldFor = (reminderType: "day" | "hour") =>
  reminderType === "day" ? "dayReminderSentAt" : "hourReminderSentAt";

const reminderEnabledFor = (
  data: Record<string, unknown>,
  reminderType: "day" | "hour",
) => {
  const value =
    reminderType === "day"
      ? data.dayReminderEnabled
      : data.hourReminderEnabled;
  return typeof value === "boolean" ? value : true;
};

const reminderTitleFor = (
  title: string,
  reminderType: "day" | "hour",
) =>
  reminderType === "day"
    ? `Event tomorrow: ${title}`
    : `Event in 1 hour: ${title}`;

const publishEventReminder = async (
  eventId: string,
  data: Record<string, unknown>,
  reminderType: "day" | "hour",
) => {
  const title = stringValue(data.title);
  const orgId = stringValue(data.orgId);
  if (!title || !orgId) {
    return false;
  }

  await publishOrgAnnouncement({
    audit: {
      action:
        reminderType === "day"
          ? "event.reminder_day_sent"
          : "event.reminder_hour_sent",
      actorUid: stringValue(data.updatedBy) ?? stringValue(data.createdBy),
      details: { eventId, reminderType, status: stringValue(data.status) },
    },
    body: eventReminderBody(data, reminderType),
    orgId,
    relatedDocId: eventId,
    sentBy: stringValue(data.updatedBy) ?? stringValue(data.createdBy),
    target: eventTarget(eventId, stringValue(data.status)),
    title: reminderTitleFor(title, reminderType),
    type: "event",
  });

  return true;
};

const dueWithinReminderWindow = (
  startTime: Date,
  now: Date,
  reminderType: "day" | "hour",
) => {
  const diffMs = startTime.getTime() - now.getTime();
  const targetMs =
    reminderType === "day" ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
  const windowMs = 5 * 60 * 1000;
  return diffMs >= targetMs - windowMs && diffMs <= targetMs;
};

const sendScheduledEventRemindersFor = async (
  reminderType: "day" | "hour",
  now: Date,
) => {
  const reminderField = reminderFieldFor(reminderType);
  const lowerBound = new Date(
    now.getTime() +
      (reminderType === "day" ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000) -
      5 * 60 * 1000,
  );
  const upperBound = new Date(
    now.getTime() +
      (reminderType === "day" ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000),
  );
  const snapshot = await db
    .collection("events")
    .where("startTime", ">=", lowerBound)
    .where("startTime", "<=", upperBound)
    .get();

  let sentCount = 0;
  for (const doc of snapshot.docs) {
    const data = asRecord(doc.data());
    if (stringValue(data.status) !== "published") {
      continue;
    }
    if (!reminderEnabledFor(data, reminderType)) {
      continue;
    }
    const startTime = toDate(data.startTime);
    if (!startTime || !dueWithinReminderWindow(startTime, now, reminderType)) {
      continue;
    }
    const lockRef = db
      .collection("event_reminder_jobs")
      .doc(`${doc.id}_${reminderType}`);
    try {
      await lockRef.create({
        createdAt: FieldValue.serverTimestamp(),
        eventId: doc.id,
        reminderType,
      });
    } catch {
      continue;
    }

    try {
      const freshSnapshot = await doc.ref.get();
      if (!freshSnapshot.exists) {
        await lockRef.delete().catch(() => undefined);
        continue;
      }
      const freshData = asRecord(freshSnapshot.data());
      if (stringValue(freshData.status) !== "published") {
        await lockRef.delete().catch(() => undefined);
        continue;
      }
      if (!reminderEnabledFor(freshData, reminderType)) {
        await lockRef.delete().catch(() => undefined);
        continue;
      }
      if (freshData[reminderField]) {
        await lockRef.delete().catch(() => undefined);
        continue;
      }
      const freshStartTime = toDate(freshData.startTime);
      if (
        !freshStartTime ||
        !dueWithinReminderWindow(freshStartTime, now, reminderType)
      ) {
        await lockRef.delete().catch(() => undefined);
        continue;
      }

      const published = await publishEventReminder(
        freshSnapshot.id,
        freshData,
        reminderType,
      );
      if (!published) {
        await lockRef.delete();
        continue;
      }

      await doc.ref.update({
        [reminderField]: FieldValue.serverTimestamp(),
      });
      sentCount += 1;
    } catch (error) {
      await lockRef.delete().catch(() => undefined);
      throw error;
    }
  }

  return sentCount;
};

const notifyEventChange = async (
  event: FirestoreEvent<QueryDocumentSnapshot | undefined, { eventId: string }>,
  action: "created" | "updated",
) => {
  const snapshot = event.data;
  if (!snapshot?.exists) {
    return;
  }
  const data = snapshot.data();
  const title = stringValue(data.title);
  const orgId = stringValue(data.orgId);
  if (!title || !orgId) {
    return;
  }
  const eventId = event.params.eventId;
  await publishOrgAnnouncement({
    audit: {
      action: `event.notification_${action}`,
      actorUid: stringValue(data.updatedBy) ?? stringValue(data.createdBy),
      details: { eventId, status: stringValue(data.status) },
    },
    body: eventBody(data, action),
    orgId,
    relatedDocId: eventId,
    sentBy: stringValue(data.updatedBy) ?? stringValue(data.createdBy),
    target: eventTarget(eventId, stringValue(data.status)),
    title: action === "created" ? `New event: ${title}` : `Event updated: ${title}`,
    type: "event",
  });
};

const marketplaceBody = (
  data: Record<string, unknown>,
  action: "created" | "updated",
) => {
  const price =
    typeof data.price === "number" ? formatCurrency(data.price) : null;
  const status = stringValue(data.status);
  const condition = stringValue(data.condition)?.replace(/_/g, " ");
  const segments = [
    action === "created"
      ? "A new marketplace item was posted."
      : "A marketplace item was updated.",
    price ? `Price: ${price}.` : null,
    condition ? `Condition: ${condition}.` : null,
    status ? `Status: ${status}.` : null,
  ].filter(Boolean);
  return segments.join(" ");
};

const notifyMarketplaceChange = async (
  event: FirestoreEvent<QueryDocumentSnapshot | undefined, { listingId: string }>,
  action: "created" | "updated",
) => {
  const snapshot = event.data;
  if (!snapshot?.exists) {
    return;
  }
  const data = snapshot.data();
  const title = stringValue(data.title);
  const orgId = stringValue(data.orgId);
  if (!title || !orgId) {
    return;
  }
  const listingId = event.params.listingId;
  await publishOrgAnnouncement({
    audit: {
      action: `marketplace.notification_${action}`,
      actorUid: stringValue(data.postedBy),
      details: { listingId, status: stringValue(data.status) },
    },
    body: marketplaceBody(data, action),
    orgId,
    relatedDocId: listingId,
    sentBy: stringValue(data.postedBy),
    target: { route: "marketplace" },
    title:
      action === "created"
        ? `New marketplace item: ${title}`
        : `Marketplace item updated: ${title}`,
    type: "marketplace",
  });
};

export const notifyEventCreated = onDocumentCreated(
  "events/{eventId}",
  async (event) => notifyEventChange(event, "created"),
);

export const notifyEventUpdated = onDocumentUpdated(
  "events/{eventId}",
  async (event) => {
    const before = asRecord(event.data?.before.data());
    const after = asRecord(event.data?.after.data());
    if (
      !recordChanged(before, after, [
        "title",
        "description",
        "category",
        "startTime",
        "location",
        "capacity",
        "status",
      ])
    ) {
      return;
    }
    await notifyEventChange(
      {
        ...event,
        data: event.data?.after,
      } as FirestoreEvent<QueryDocumentSnapshot | undefined, { eventId: string }>,
      "updated",
    );
  },
);

export const notifyMarketplaceCreated = onDocumentCreated(
  "marketplace/{listingId}",
  async (event) => notifyMarketplaceChange(event, "created"),
);

export const notifyMarketplaceUpdated = onDocumentUpdated(
  "marketplace/{listingId}",
  async (event) => {
    const before = asRecord(event.data?.before.data());
    const after = asRecord(event.data?.after.data());
    if (
      !recordChanged(before, after, [
        "title",
        "description",
        "price",
        "condition",
        "status",
        "imageURL",
        "contactInstruction",
        "contactPhone",
        "contactEmail",
      ])
    ) {
      return;
    }
    await notifyMarketplaceChange(
      {
        ...event,
        data: event.data?.after,
      } as FirestoreEvent<QueryDocumentSnapshot | undefined, { listingId: string }>,
      "updated",
    );
  },
);

export const sendScheduledEventReminders = onSchedule(
  {
    schedule: "every 5 minutes",
    timeZone: "Africa/Lagos",
  },
  async () => {
    const now = new Date();
    await Promise.all([
      sendScheduledEventRemindersFor("day", now),
      sendScheduledEventRemindersFor("hour", now),
    ]);
  },
);

export const formatNotificationCurrency = formatCurrency;
export const formatNotificationDate = formatDateOnly;
