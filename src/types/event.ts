export type EventCategory = 'meeting' | 'social' | 'volunteer' | 'committee';

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  meeting: '#C9962A',
  social: '#E74C3C',
  volunteer: '#27AE60',
  committee: '#7A9880',
};

export interface TiwaniEvent {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  dateTime: Date;
  location: string;
  createdBy: string;
  rsvpList: string[];
  capacity: number;
  attendees: string[];
}
