import {AppColors} from '../theme';

export type EventCategory = 'meeting' | 'social' | 'volunteer' | 'committee';
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';

/** Fallback when a theme context is not available (tests / non-UI helpers). */
export const CATEGORY_COLORS: Record<EventCategory, string> = {
  meeting: '#C9962A',
  social: '#E74C3C',
  volunteer: '#27AE60',
  committee: '#7A9880',
};

/** Theme-aware category accents — meeting follows the active accent (gold token). */
export const getCategoryColors = (
  colors: AppColors,
): Record<EventCategory, string> => ({
  meeting: colors.gold.default,
  social: colors.status.error,
  volunteer: colors.status.success,
  committee: colors.text.secondary,
});

export interface TiwaniEvent {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  dateTime: Date;
  location: string;
  meetingLink: string | null;
  createdBy: string;
  status: EventStatus;
  rsvpList: string[];
  rsvpCount: number;
  capacity: number;
  attendees: string[];
  dayReminderEnabled: boolean;
  hourReminderEnabled: boolean;
}

export interface EventAttendee {
  uid: string;
  fullName: string;
  email: string;
  photoURL: string | null;
  checkedIn: boolean;
}
