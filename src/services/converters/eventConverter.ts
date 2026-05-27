import {EventCategory, EventStatus, TiwaniEvent} from '../../types/event';
import {
  DocumentSnapshotLike,
  RawRecord,
  asDate,
  asNumber,
  asString,
  asStringArray,
  enumValue,
  snapshotToRecord,
} from './shared';

const categories: EventCategory[] = ['meeting', 'social', 'volunteer', 'committee'];
const statuses: EventStatus[] = ['draft', 'published', 'cancelled', 'completed'];

export const eventFromRecord = (record: RawRecord): TiwaniEvent => {
  const rsvpList = asStringArray(record.rsvpList);
  return {
    id: asString(record.id),
    title: asString(record.title),
    description: asString(record.description),
    category: enumValue(record.category, categories, 'meeting'),
    dateTime: asDate(record.dateTime),
    location: asString(record.location),
    createdBy: asString(record.createdBy),
    status: enumValue(record.status, statuses, 'draft'),
    rsvpList,
    rsvpCount: asNumber(record.rsvpCount, rsvpList.length),
    capacity: asNumber(record.capacity),
    attendees: asStringArray(record.attendees),
  };
};

export const eventFromSnapshot = (snapshot: DocumentSnapshotLike): TiwaniEvent =>
  eventFromRecord(snapshotToRecord(snapshot));

