import {DuesPeriod, LedgerEntry, LedgerType} from '../../types/finance';
import {
  DocumentSnapshotLike,
  RawRecord,
  asBoolean,
  asDate,
  asNullableDate,
  asNullableString,
  asNumber,
  asString,
  enumValue,
  snapshotToRecord,
} from './shared';

const ledgerTypes: LedgerType[] = ['dues', 'levy', 'fine', 'pledge', 'payment'];
const duesStatuses: DuesPeriod['status'][] = ['active', 'settled', 'overdue'];

export const ledgerEntryFromRecord = (record: RawRecord): LedgerEntry => {
  const paymentMethod = asNullableString(record.paymentMethod);
  const reference = asNullableString(record.reference);
  return {
    id: asString(record.id),
    uid: asString(record.uid),
    type: enumValue(record.type, ledgerTypes, 'dues'),
    label: asString(record.label),
    amount: asNumber(record.amount),
    dueDate: asNullableDate(record.dueDate),
    paid: asBoolean(record.paid),
    paidAt: asNullableDate(record.paidAt),
    ...(paymentMethod ? {paymentMethod} : {}),
    ...(reference ? {reference} : {}),
    note: asString(record.note),
    duesPeriodId: asNullableString(record.duesPeriodId) ?? undefined,
  };
};

export const ledgerEntryFromSnapshot = (snapshot: DocumentSnapshotLike): LedgerEntry =>
  ledgerEntryFromRecord(snapshotToRecord(snapshot));

export const duesPeriodFromRecord = (record: RawRecord): DuesPeriod => ({
  id: asString(record.id),
  name: asString(record.name),
  amount: asNumber(record.amount),
  dueDate: asDate(record.dueDate),
  status: enumValue(record.status, duesStatuses, 'active'),
  totalMembers: asNumber(record.totalMembers),
  paidCount: asNumber(record.paidCount),
});

export const duesPeriodFromSnapshot = (snapshot: DocumentSnapshotLike): DuesPeriod =>
  duesPeriodFromRecord(snapshotToRecord(snapshot));

