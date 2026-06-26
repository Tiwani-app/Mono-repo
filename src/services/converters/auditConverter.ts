import { AuditLog } from "../../types/audit";
import { asDate, RawRecord, requiredString } from "./shared";

const asDetails = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const nullableString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

export const auditLogFromRecord = (record: RawRecord): AuditLog => ({
  id: requiredString(record, "id"),
  action: requiredString(record, "action"),
  actorRole: nullableString(record.actorRole),
  actorUid: nullableString(record.actorUid),
  createdAt: asDate(record.createdAt, new Date(0)),
  details: asDetails(record.details),
  orgId: requiredString(record, "orgId"),
  targetPath: requiredString(record, "targetPath"),
});
