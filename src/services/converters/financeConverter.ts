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
    duesPeriodId: asNullableString(record.duesPeriodId) ?? undefined,
  };
};

export const duesPeriodFromRecord = (record: RawRecord): DuesPeriod => ({
  id: requiredString(record, "id"),
  name: requiredString({ name: record.label }, "name"),
  amount: requiredNumber(record, "amount"),
  dueDate: requiredDate(record, "dueDate"),
  status: requiredEnum(record.status, duesStatuses, "status"),
  totalMembers: requiredNumber(record, "totalMembers"),
  paidCount: requiredNumber(record, "paidCount"),
});
