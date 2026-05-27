import {
  Listing,
  ListingCondition,
  ListingStatus,
} from '../../types/marketplace';
import {
  DocumentSnapshotLike,
  RawRecord,
  asDate,
  asNullableString,
  asNumber,
  asString,
  enumValue,
  snapshotToRecord,
} from './shared';

const listingStatuses: ListingStatus[] = ['available', 'sold', 'archived'];
const listingConditions: ListingCondition[] = ['new', 'like_new', 'good', 'fair', 'used'];

export const listingFromRecord = (record: RawRecord): Listing => ({
  id: asString(record.id),
  title: asString(record.title),
  price: asNumber(record.price),
  description: asString(record.description),
  condition: enumValue(record.condition, listingConditions, 'good'),
  status: enumValue(record.status, listingStatuses, 'available'),
  imageURL: asNullableString(record.imageURL),
  postedBy: asString(record.postedBy),
  postedByName: asString(record.postedByName),
  contactInstruction: asString(record.contactInstruction),
  createdAt: asDate(record.createdAt),
  updatedAt: asDate(record.updatedAt),
});

export const listingFromSnapshot = (snapshot: DocumentSnapshotLike): Listing =>
  listingFromRecord(snapshotToRecord(snapshot));

