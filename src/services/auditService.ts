import { AuditLog } from "../types/audit";
import { auditLogFromRecord } from "./converters/auditConverter";
import { startOrgSubscription } from "./firebaseHelpers";

export const subscribeToAuditLogs = (
  callback: (logs: AuditLog[]) => void,
  onError?: (error: Error) => void,
) =>
  startOrgSubscription(
    "audit_logs",
    auditLogFromRecord,
    callback,
    (query) => query.orderBy("createdAt", "desc").limit(100),
    onError,
  );
