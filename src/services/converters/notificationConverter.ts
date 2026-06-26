import {
  NotificationTarget,
  NotificationType,
  TiwaniNotification,
} from "../../types/notification";
import {
  RawRecord,
  asDate,
  asStringArray,
  requiredEnum,
  requiredString,
} from "./shared";

const notificationTypes: NotificationType[] = [
  "event",
  "finance",
  "vote",
  "general",
  "marketplace",
];
const targetRoutes: NotificationTarget["route"][] = [
  "event_detail",
  "poll_vote",
  "election_ballot",
  "my_ledger",
  "marketplace",
  "library",
];

const targetFromRecord = (value: unknown): NotificationTarget | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as RawRecord;
  const route = requiredEnum(record.route, targetRoutes, "target.route");
  switch (route) {
    case "event_detail":
      return { route, eventId: requiredString(record, "eventId") };
    case "poll_vote":
      return { route, pollId: requiredString(record, "pollId") };
    case "election_ballot":
      return { route, electionId: requiredString(record, "electionId") };
    case "my_ledger": {
      const memberId =
        typeof record.memberId === "string" && record.memberId.trim()
          ? record.memberId
          : undefined;
      return memberId ? { route, memberId } : { route };
    }
    case "marketplace":
    case "library":
      return { route };
  }
};

export const notificationFromRecord = (
  record: RawRecord,
): TiwaniNotification => ({
  id: requiredString(record, "id"),
  type: requiredEnum(record.type, notificationTypes, "type"),
  title: requiredString(record, "title"),
  body: requiredString(record, "body"),
  readBy: asStringArray(record.readBy, "readBy"),
  sentAt: asDate(record.sentAt ?? record.createdAt, new Date()),
  target: targetFromRecord(record.target),
});
