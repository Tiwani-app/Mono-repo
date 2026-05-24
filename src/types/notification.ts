export type NotificationType = 'event' | 'finance' | 'vote' | 'general' | 'marketplace';

export type NotificationTarget =
  | {route: 'event_detail'; eventId: string}
  | {route: 'poll_vote'; pollId: string}
  | {route: 'election_ballot'; electionId: string}
  | {route: 'my_ledger'; memberId?: string}
  | {route: 'marketplace'}
  | {route: 'library'};

export interface TiwaniNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  sentAt: Date;
  target?: NotificationTarget;
}
