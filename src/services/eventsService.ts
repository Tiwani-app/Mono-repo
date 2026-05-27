import {
  EventAttendee,
  EventCategory,
  EventStatus,
  TiwaniEvent,
} from "../types/event";
import { delay, mockEvents, mockUsers } from "./mockData";

export interface EventInput {
  title: string;
  description: string;
  category: EventCategory;
  dateTime: Date;
  location: string;
  capacity: number;
  status: EventStatus;
}

let events = mockEvents.slice();
const subscribers = new Set<(events: TiwaniEvent[]) => void>();
const eventCategories: EventCategory[] = [
  "meeting",
  "social",
  "volunteer",
  "committee",
];
const eventStatuses: EventStatus[] = [
  "draft",
  "published",
  "cancelled",
  "completed",
];

const sortEvents = (items: TiwaniEvent[]) =>
  [...items].sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

const withRsvpCount = (event: TiwaniEvent): TiwaniEvent => ({
  ...event,
  rsvpCount: event.rsvpList.length,
});

const eventsSnapshot = (items: TiwaniEvent[]) =>
  sortEvents(items).map(withRsvpCount);

const emitEvents = () => {
  const snapshot = eventsSnapshot(events);
  subscribers.forEach((callback) => callback(snapshot));
};

export const subscribeToEvents = (
  callback: (events: TiwaniEvent[]) => void,
) => {
  subscribers.add(callback);
  callback(eventsSnapshot(events));
  return () => {
    subscribers.delete(callback);
  };
};

export const getEvent = async (eventId: string): Promise<TiwaniEvent> => {
  await delay();
  const event = events.find((item) => item.id === eventId);
  if (!event) {
    throw new Error("Event not found.");
  }
  return withRsvpCount(event);
};

const attendeeFromUid = (event: TiwaniEvent, uid: string): EventAttendee => {
  const member = mockUsers.find((user) => user.uid === uid);
  return {
    uid,
    fullName: member?.fullName ?? "Unknown member",
    email: member?.email ?? "",
    photoURL: member?.photoURL ?? null,
    checkedIn: event.attendees.includes(uid),
  };
};

const normalizeEventInput = (data: EventInput): EventInput => ({
  ...data,
  title: data.title.trim(),
  description: data.description.trim(),
  location: data.location.trim(),
});

const validateEventInput = (data: EventInput) => {
  if (!data.title) {
    throw new Error("Event title is required.");
  }
  if (!data.description) {
    throw new Error("Event description is required.");
  }
  if (!eventCategories.includes(data.category)) {
    throw new Error("Event category is invalid.");
  }
  if (
    !(data.dateTime instanceof Date) ||
    Number.isNaN(data.dateTime.getTime())
  ) {
    throw new Error("Event date and time are required.");
  }
  if (!data.location) {
    throw new Error("Event location is required.");
  }
  if (!Number.isInteger(data.capacity) || data.capacity < 0) {
    throw new Error("Event capacity must be zero or a positive whole number.");
  }
  if (!eventStatuses.includes(data.status)) {
    throw new Error("Event status is invalid.");
  }
};

export const getEventAttendees = async (
  eventId: string,
): Promise<EventAttendee[]> => {
  const event = await getEvent(eventId);
  return event.rsvpList.map((uid) => attendeeFromUid(event, uid));
};

export const createEvent = async (data: EventInput): Promise<TiwaniEvent> => {
  await delay();
  const normalized = normalizeEventInput(data);
  validateEventInput(normalized);
  const event: TiwaniEvent = {
    ...normalized,
    id: `event-${Date.now()}`,
    createdBy: "admin-1",
    rsvpList: [],
    rsvpCount: 0,
    attendees: [],
  };
  events = [...events, event];
  emitEvents();
  return event;
};

export const updateEvent = async (
  eventId: string,
  data: Partial<EventInput>,
): Promise<void> => {
  await delay();
  const existingEvent = events.find((event) => event.id === eventId);
  if (!existingEvent) {
    throw new Error("Event not found.");
  }
  const normalized = normalizeEventInput({
    title: data.title ?? existingEvent.title,
    description: data.description ?? existingEvent.description,
    category: data.category ?? existingEvent.category,
    dateTime: data.dateTime ?? existingEvent.dateTime,
    location: data.location ?? existingEvent.location,
    capacity: data.capacity ?? existingEvent.capacity,
    status: data.status ?? existingEvent.status,
  });
  validateEventInput(normalized);
  events = events.map((event) =>
    event.id === eventId ? { ...event, ...normalized } : event,
  );
  emitEvents();
};

export const cancelEvent = async (eventId: string): Promise<void> => {
  await updateEvent(eventId, { status: "cancelled" });
};

export const toggleRsvp = async (
  eventId: string,
  userId: string,
): Promise<void> => {
  await delay();
  if (!events.some((event) => event.id === eventId)) {
    throw new Error("Event not found.");
  }
  events = events.map((event) => {
    if (event.id !== eventId) {
      return event;
    }
    const removingRsvp = event.rsvpList.includes(userId);
    if (!removingRsvp && event.status !== "published") {
      throw new Error("RSVP is not available for this event.");
    }
    if (
      !removingRsvp &&
      event.capacity > 0 &&
      event.rsvpList.length >= event.capacity
    ) {
      throw new Error("This event is full.");
    }
    const rsvpList = removingRsvp
      ? event.rsvpList.filter((uid) => uid !== userId)
      : [...event.rsvpList, userId];
    const attendees = removingRsvp
      ? event.attendees.filter((uid) => uid !== userId)
      : event.attendees;
    return { ...event, attendees, rsvpList, rsvpCount: rsvpList.length };
  });
  emitEvents();
};

export const checkInAttendee = async (
  eventId: string,
  userId: string,
): Promise<void> => {
  await delay();
  const event = events.find((item) => item.id === eventId);
  if (!event) {
    throw new Error("Event not found.");
  }
  if (!event.rsvpList.includes(userId)) {
    throw new Error("Only RSVP attendees can be checked in.");
  }
  if (event.attendees.includes(userId)) {
    return;
  }
  events = events.map((item) =>
    item.id === eventId
      ? { ...item, attendees: [...item.attendees, userId] }
      : item,
  );
  emitEvents();
};
