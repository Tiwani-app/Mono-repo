import { onSchedule } from "firebase-functions/v2/scheduler";
import { publishOrgAnnouncement } from "./activityNotifications";
import { db } from "./firebase";

// "MM-dd" for today, computed in the org's operating timezone rather than
// the function's UTC instant so the day boundary lines up with Africa/Lagos.
const todayMonthDay = (): string => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Lagos",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${month}-${day}`;
};

// dateOfBirth is stored as "yyyy-MM-dd"; comparing the "MM-dd" suffix avoids
// a Firestore query Firestore can't express (there's no year-agnostic index).
const matchesBirthday = (dateOfBirth: unknown, monthDay: string): boolean =>
  typeof dateOfBirth === "string" &&
  dateOfBirth.trim().length === 10 &&
  dateOfBirth.trim().slice(5) === monthDay;

const composeBirthdayBody = (names: string[]): string => {
  const joined =
    names.length <= 1
      ? names[0]
      : names.length === 2
        ? `${names[0]} & ${names[1]}`
        : `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
  return `Happy birthday to ${joined}! 🎉`;
};

export const sendBirthdayAnnouncements = onSchedule(
  {
    schedule: "every day 08:00",
    timeZone: "Africa/Lagos",
  },
  async () => {
    const monthDay = todayMonthDay();
    const snapshot = await db
      .collection("users")
      .where("status", "==", "active")
      .get();

    const byOrg = new Map<string, { names: string[]; uids: string[] }>();
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (!matchesBirthday(data.dateOfBirth, monthDay)) {
        return;
      }
      const orgId = typeof data.orgId === "string" ? data.orgId : "";
      const fullName =
        typeof data.fullName === "string" ? data.fullName.trim() : "";
      if (!orgId || !fullName) {
        return;
      }
      const group = byOrg.get(orgId) ?? { names: [], uids: [] };
      group.names.push(fullName);
      group.uids.push(doc.id);
      byOrg.set(orgId, group);
    });

    await Promise.all(
      Array.from(byOrg.entries()).map(([orgId, group]) =>
        publishOrgAnnouncement({
          audit: {
            action: "birthday.push_sent",
            actorRole: "system",
            actorUid: "system",
            details: { count: group.names.length, uids: group.uids },
          },
          body: composeBirthdayBody(group.names),
          orgId,
          relatedDocId: null,
          sentBy: null,
          target: null,
          title: "🎂 Happy Birthday!",
          type: "birthday",
        }),
      ),
    );
  },
);
