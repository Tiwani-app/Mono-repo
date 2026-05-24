import { EventAttendee, EventCategory, EventStatus, TiwaniEvent } from '../types/event';
import { delay, mockEvents, mockUsers } from './mockData';

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

const sortEvents = (items: TiwaniEvent[]) =>
  [...items].sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

const emitEvents = () => {
  const snapshot = sortEvents(events);
  subscribers.forEach(callback => callback(snapshot));
};

export const subscribeToEvents = (callback: (events: TiwaniEvent[]) => void) => {
  subscribers.add(callback);
  callback(sortEvents(events));
  return () => {
    subscribers.delete(callback);
  };
};

export const getEvent = async (eventId: string): Promise<TiwaniEvent> => {
  await delay();
  const event = events.find(item => item.id === eventId);
  if (!event) {
    throw new Error('Event not found.');
  }
  return event;
};

const attendeeFromUid = (event: TiwaniEvent, uid: string): EventAttendee => {
  const member = mockUsers.find(user => user.uid === uid);
  return {
    uid,
    fullName: member?.fullName ?? 'Unknown member',
    email: member?.email ?? '',
    photoURL: member?.photoURL ?? null,
    checkedIn: event.attendees.includes(uid),
  };
};

export const getEventAttendees = async (eventId: string): Promise<EventAttendee[]> => {
  const event = await getEvent(eventId);
  return event.rsvpList.map(uid => attendeeFromUid(event, uid));
};

export const createEvent = async (data: EventInput): Promise<TiwaniEvent> => {
  await delay();
  const event: TiwaniEvent = {
    ...data,
    id: `event-${Date.now()}`,
    createdBy: 'admin-1',
    rsvpList: [],
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
  if (!events.some(event => event.id === eventId)) {
    throw new Error('Event not found.');
  }
  events = events.map(event => (event.id === eventId ? {...event, ...data} : event));
  emitEvents();
};

export const cancelEvent = async (eventId: string): Promise<void> => {
  await updateEvent(eventId, {status: 'cancelled'});
};

export const toggleRsvp = async (eventId: string, userId: string): Promise<void> => {
  await delay();
  if (!events.some(event => event.id === eventId)) {
    throw new Error('Event not found.');
  }
  events = events.map(event => {
    if (event.id !== eventId) {
      return event;
    }
    const removingRsvp = event.rsvpList.includes(userId);
    const rsvpList = removingRsvp
      ? event.rsvpList.filter(uid => uid !== userId)
      : [...event.rsvpList, userId];
    const attendees = removingRsvp
      ? event.attendees.filter(uid => uid !== userId)
      : event.attendees;
    return {...event, attendees, rsvpList};
  });
  emitEvents();
};

export const checkInAttendee = async (
  eventId: string,
  userId: string,
): Promise<void> => {
  await delay();
  const event = events.find(item => item.id === eventId);
  if (!event) {
    throw new Error('Event not found.');
  }
  if (!event.rsvpList.includes(userId)) {
    throw new Error('Only RSVP attendees can be checked in.');
  }
  if (event.attendees.includes(userId)) {
    return;
  }
  events = events.map(item =>
    item.id === eventId
      ? {...item, attendees: [...item.attendees, userId]}
      : item,
  );
  emitEvents();
};
