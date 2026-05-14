import {TiwaniEvent} from '../types/event';
import {delay, mockEvents} from './mockData';

export const subscribeToEvents = (callback: (events: TiwaniEvent[]) => void) => {
  callback([...mockEvents].sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime()));
  return () => {};
};

export const getEvent = async (eventId: string): Promise<TiwaniEvent> => {
  await delay();
  const event = mockEvents.find(item => item.id === eventId);
  if (!event) {
    throw new Error('Event not found.');
  }
  return event;
};

export const toggleRsvp = async (_eventId: string, _userId: string): Promise<void> => {
  await delay();
};

export const checkInMember = async (_eventId: string, _memberId: string): Promise<void> => {
  await delay();
};

export const createEvent = async (
  _data: Omit<TiwaniEvent, 'id' | 'rsvpList' | 'attendees' | 'createdBy'>,
): Promise<void> => {
  await delay();
};
