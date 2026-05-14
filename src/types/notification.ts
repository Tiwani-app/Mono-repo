export type NotificationType = 'event' | 'finance' | 'vote' | 'general' | 'marketplace';

export interface TiwaniNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  sentAt: Date;
}
