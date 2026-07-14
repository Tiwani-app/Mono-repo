import {
  EventAttendee,
  EventCategory,
  EventStatus,
  TiwaniEvent,
} from "../types/event";
import { firebaseFirestoreModule } from "../config/firebase";
import { DataSyncSnapshotMeta } from "../types/sync";
import { eventFromRecord } from "./converters/eventConverter";
import { currentUid, firestore, getCurrentOrgId, startOrgSubscription } from "./firebaseHelpers";

export interface EventInput {
  title: string;
  description: string;
  category: EventCategory;
  dateTime: Date;
  location: string;
  meetingLink: string | null;
  capacity: number;
  status: EventStatus;
  dayReminderEnabled: boolean;
  hourReminderEnabled: boolean;
}

const eventData = (data: Partial<EventInput>) => ({
  ...(data.title !== undefined ? { title: data.title.trim() } : {}),
  ...(data.description !== undefined
    ? { description: data.description.trim() }
    : {}),
  ...(data.category !== undefined ? { category: data.category } : {}),
  ...(data.dateTime !== undefined ? { startTime: data.dateTime } : {}),
  ...(data.location !== undefined ? { location: data.location.trim() } : {}),
  ...(data.meetingLink !== undefined
    ? { meetingLink: data.meetingLink?.trim() || null }
    : {}),
  ...(data.capacity !== undefined ? { capacity: data.capacity } : {}),
  ...(data.status !== undefined ? { status: data.status } : {}),
  ...(data.dayReminderEnabled !== undefined
    ? { dayReminderEnabled: data.dayReminderEnabled }
    : {}),
  ...(data.hourReminderEnabled !== undefined
    ? { hourReminderEnabled: data.hourReminderEnabled }
    : {}),
});

export const subscribeToEvents = (
  callback: (events: TiwaniEvent[]) => void,
  onError?: (error: Error) => void,
  options: { includeUnpublished?: boolean } = {},
  onSnapshotMeta?: (meta: DataSyncSnapshotMeta) => void,
) =>
  startOrgSubscription(
    "events",
    eventFromRecord,
    (events) =>
      callback(
        events.sort((left, right) => left.dateTime.getTime() - right.dateTime.getTime()),
      ),
    options.includeUnpublished
      ? undefined
      : (query) => query.where("status", "==", "published"),
    onError,
    onSnapshotMeta,
  );

export const getEvent = async (eventId: string): Promise<TiwaniEvent> => {
  const snapshot = await firestore().collection("events").doc(eventId).get();
  if (!snapshot.exists()) {
    throw new Error("Event not found.");
  }
  return eventFromRecord({ id: snapshot.id, ...(snapshot.data() ?? {}) });
};

export const getEventAttendees = async (
  eventId: string,
): Promise<EventAttendee[]> => {
  const event = await getEvent(eventId);
  if (event.rsvpList.length === 0) {
    return [];
  }
  // Batch the directory lookups (30 ids per "in" query) instead of one read
  // per attendee. The orgId/status filters mirror the directory read rule so
  // the rules engine can prove list queries compliant; anyone the query
  // misses (e.g. no longer active) falls back to a tolerant per-doc read.
  const orgId = await getCurrentOrgId();
  const documentId = firebaseFirestoreModule().FieldPath.documentId();
  const chunks: string[][] = [];
  for (let index = 0; index < event.rsvpList.length; index += 30) {
    chunks.push(event.rsvpList.slice(index, index + 30));
  }
  const memberByUid = new Map<string, Record<string, unknown>>();
  await Promise.all(
    chunks.map(async (chunk) => {
      const snapshot = await firestore()
        .collection("member_directory")
        .where("orgId", "==", orgId)
        .where("status", "==", "active")
        .where(documentId, "in", chunk)
        .get();
      snapshot.docs.forEach((doc) => memberByUid.set(doc.id, doc.data() ?? {}));
    }),
  );
  await Promise.all(
    event.rsvpList
      .filter((uid) => !memberByUid.has(uid))
      .map(async (uid) => {
        try {
          const fallback = await firestore().collection("users").doc(uid).get();
          if (fallback.exists()) {
            memberByUid.set(uid, fallback.data() ?? {});
          }
        } catch {
          // Leave the attendee as "Unknown member" when the profile is
          // unreadable rather than failing the whole roster.
        }
      }),
  );
  return event.rsvpList.map((uid) => {
    const member = memberByUid.get(uid);
    return {
      uid,
      fullName:
        typeof member?.fullName === "string" ? member.fullName : "Unknown member",
      email: typeof member?.email === "string" ? member.email : "",
      photoURL: typeof member?.photoURL === "string" ? member.photoURL : null,
      checkedIn: event.attendees.includes(uid),
    };
  });
};

export const createEvent = async (data: EventInput): Promise<TiwaniEvent> => {
  const ref = firestore().collection("events").doc();
  await ref.set({
    eventId: ref.id,
    orgId: await getCurrentOrgId(),
    createdBy: currentUid(),
    ...eventData(data),
    rsvpList: [],
    attendeeList: [],
  });
  return getEvent(ref.id);
};

export const updateEvent = async (
  eventId: string,
  data: Partial<EventInput>,
): Promise<TiwaniEvent> => {
  await firestore().collection("events").doc(eventId).update(eventData(data));
  return getEvent(eventId);
};

export const cancelEvent = async (eventId: string): Promise<void> => {
  await updateEvent(eventId, { status: "cancelled" });
};

export const toggleRsvp = async (
  eventId: string,
  userId: string,
): Promise<void> => {
  if (userId !== currentUid()) {
    throw new Error("You can only update your own RSVP.");
  }
  const eventRef = firestore().collection("events").doc(eventId);
  await firestore().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(eventRef);
    if (!snapshot.exists()) {
      throw new Error("Event not found.");
    }
    const event = snapshot.data() ?? {};
    const rsvpList = Array.isArray(event.rsvpList)
      ? event.rsvpList.filter((uid): uid is string => typeof uid === "string")
      : [];
    const removing = rsvpList.includes(userId);
    if (!removing && event.status !== "published") {
      throw new Error("RSVP is not available for this event.");
    }
    if (
      !removing &&
      typeof event.capacity === "number" &&
      event.capacity > 0 &&
      rsvpList.length >= event.capacity
    ) {
      throw new Error("This event is full.");
    }
    transaction.update(eventRef, {
      rsvpList: removing
        ? rsvpList.filter((uid) => uid !== userId)
        : [...rsvpList, userId],
    });
  });
};

export const checkInAttendee = async (
  eventId: string,
  userId: string,
): Promise<void> => {
  const database = firestore();
  const eventRef = database.collection("events").doc(eventId);
  const attendanceRef = database
    .collection("users")
    .doc(userId)
    .collection("attendance")
    .doc(eventId);
  await database.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(eventRef);
    if (!snapshot.exists()) {
      throw new Error("Event not found.");
    }
    const event = snapshot.data() ?? {};
    const rsvpList = Array.isArray(event.rsvpList) ? event.rsvpList : [];
    const attendeeList = Array.isArray(event.attendeeList) ? event.attendeeList : [];
    if (!rsvpList.includes(userId)) {
      throw new Error("Only members who RSVP'd can be checked in.");
    }
    if (attendeeList.includes(userId)) {
      throw new Error("This member has already checked in.");
    }
    if (
      typeof event.capacity === "number" &&
      event.capacity > 0 &&
      attendeeList.length >= event.capacity
    ) {
      throw new Error("This event has reached maximum capacity.");
    }
    transaction.update(eventRef, { attendeeList: [...attendeeList, userId] });
    transaction.set(attendanceRef, {
      eventId,
      method: "admin_tap",
      checkedInAt: new Date(),
    });
  });
};

export const checkOutAttendee = async (
  eventId: string,
  userId: string,
): Promise<void> => {
  const database = firestore();
  const eventRef = database.collection("events").doc(eventId);
  const attendanceRef = database
    .collection("users")
    .doc(userId)
    .collection("attendance")
    .doc(eventId);
  await database.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(eventRef);
    if (!snapshot.exists()) {
      throw new Error("Event not found.");
    }
    const event = snapshot.data() ?? {};
    const attendeeList = Array.isArray(event.attendeeList) ? event.attendeeList : [];
    if (!attendeeList.includes(userId)) {
      throw new Error("This member is not checked in.");
    }
    transaction.update(eventRef, {
      attendeeList: attendeeList.filter((uid: string) => uid !== userId),
    });
    transaction.delete(attendanceRef);
  });
};
