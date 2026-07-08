import {
  DuesPeriod,
  LedgerEntry,
  LedgerPaidStatus,
  LedgerType,
} from "../../types/finance";
import {
  RawRecord,
  asNullableDate,
  asNullableString,
  requiredDate,
  requiredEnum,
  requiredNumber,
  requiredString,
} from "./shared";

const ledgerTypes: LedgerType[] = ["dues", "levy", "fine", "pledge", "payment"];
const ledgerPaidStatuses: LedgerPaidStatus[] = ["unpaid", "partial", "paid"];
const duesStatuses: DuesPeriod["status"][] = ["active", "settled", "overdue"];

export const ledgerEntryFromRecord = (record: RawRecord): LedgerEntry => {
  const paymentMethod = asNullableString(record.paymentMethod);
  const reference = asNullableString(record.reference);
  const recordedBy = asNullableString(record.recordedBy);
  const recordedByName = asNullableString(record.recordedByName);
  const recordedByEmail = asNullableString(record.recordedByEmail);
  const recordedByPhone = asNullableString(record.recordedByPhone);
  const paidStatus = requiredEnum(
    record.paidStatus,
    ledgerPaidStatuses,
    "paidStatus",
  );
  return {
    id: requiredString(record, "id"),
    uid: requiredString({ uid: record.memberId }, "uid"),
    type: requiredEnum(record.type, ledgerTypes, "type"),
    label: requiredString(record, "label"),
    amount: requiredNumber(record, "amount"),
    amountPaid: requiredNumber(record, "amountPaid"),
    dueDate: asNullableDate(record.dueDate, "dueDate"),
    paid: paidStatus === "paid",
    paidStatus,
    paidAt: asNullableDate(record.paidAt, "paidAt"),
    ...(paymentMethod ? { paymentMethod } : {}),
    ...(reference ? { reference } : {}),
    note: typeof record.note === "string" ? record.note : "",
    ...(recordedBy ? { recordedBy } : {}),
    ...(recordedByName ? { recordedByName } : {}),
    ...(recordedByEmail ? { recordedByEmail } : {}),
    ...(recordedByPhone ? { recordedByPhone } : {}),
    duesPeriodId: asNullableString(record.duesPeriodId) ?? undefined,
  };
};

export const duesPeriodFromRecord = (record: RawRecord): DuesPeriod => {
  const createdBy = asNullableString(record.createdBy);
  const createdByName = asNullableString(record.createdByName);
  const createdByEmail = asNullableString(record.createdByEmail);
  const createdByPhone = asNullableString(record.createdByPhone);
  return {
    id: requiredString(record, "id"),
    name: requiredString({ name: record.label }, "name"),
    amount: requiredNumber(record, "amount"),
    dueDate: requiredDate(record, "dueDate"),
    status: requiredEnum(record.status, duesStatuses, "status"),
    totalMembers: requiredNumber(record, "totalMembers"),
    paidCount: requiredNumber(record, "paidCount"),
    ...(createdBy ? { createdBy } : {}),
    ...(createdByName ? { createdByName } : {}),
    ...(createdByEmail ? { createdByEmail } : {}),
    ...(createdByPhone ? { createdByPhone } : {}),
  };
};
