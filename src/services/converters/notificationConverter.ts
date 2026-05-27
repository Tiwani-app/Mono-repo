import {
  NotificationTarget,
  NotificationType,
  TiwaniNotification,
} from '../../types/notification';
import {
  DocumentSnapshotLike,
  RawRecord,
  asDate,
  asString,
  enumValue,
  snapshotToRecord,
} from './shared';

const notificationTypes: NotificationType[] = [
  'event',
  'finance',
  'vote',
  'general',
  'marketplace',
];
const targetRoutes: NotificationTarget['route'][] = [
  'event_detail',
  'poll_vote',
  'election_ballot',
  'my_ledger',
  'marketplace',
  'library',
];

const targetFromRecord = (value: unknown): NotificationTarget | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const record = value as RawRecord;
  const route = enumValue(record.route, targetRoutes, 'library');
  switch (route) {
    case 'event_detail':
      return {route, eventId: asString(record.eventId)};
    case 'poll_vote':
      return {route, pollId: asString(record.pollId)};
    case 'election_ballot':
      return {route, electionId: asString(record.electionId)};
    case 'my_ledger': {
      const memberId = asString(record.memberId);
      return memberId ? {route, memberId} : {route};
    }
    case 'marketplace':
    case 'library':
      return {route};
  }
};

export const notificationFromRecord = (record: RawRecord): TiwaniNotification => ({
  id: asString(record.id),
  type: enumValue(record.type, notificationTypes, 'general'),
  title: asString(record.title),
  body: asString(record.body),
  sentAt: asDate(record.sentAt ?? record.createdAt),
  target: targetFromRecord(record.target),
});

export const notificationFromSnapshot = (snapshot: DocumentSnapshotLike): TiwaniNotification =>
  notificationFromRecord(snapshotToRecord(snapshot));

