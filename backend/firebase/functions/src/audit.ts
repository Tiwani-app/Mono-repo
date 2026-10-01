import { FieldValue } from "firebase-admin/firestore";
import { db } from "./firebase";
import { AuthenticatedUser } from "./types";

/**
 * A transaction or batch, narrowed to the `.set(ref, data)` shape used here.
 * Both `Transaction` and `WriteBatch` satisfy it; the explicit type avoids the
 * "union of incompatible overloads is not callable" error on the union itself.
 */
type AuditWriter = {
  set(
    documentRef: FirebaseFirestore.DocumentReference,
    data: FirebaseFirestore.WithFieldValue<FirebaseFirestore.DocumentData>,
  ): unknown;
};

const appendAuditEntry = (
  actor: { actorUid: string; actorRole: string; orgId: string },
  action: string,
  targetPath: string,
  details: Record<string, unknown>,
  writer?: AuditWriter,
) => {
  const entry = {
    action,
    ...actor,
    targetPath,
    details,
    createdAt: FieldValue.serverTimestamp(),
  };
  if (writer) {
    return writer.set(db.collection("audit_logs").doc(), entry);
  }
  return db.collection("audit_logs").add(entry);
};

/**
 * Append an entry to the `audit_logs` collection.
 *
 * Pass a transaction or batch as `writer` to enrol the write in it (atomic with
 * the surrounding transaction/batch); omit it for a standalone write.
 */
export const writeAuditLog = (
  user: AuthenticatedUser,
  action: string,
  targetPath: string,
  details: Record<string, unknown> = {},
  writer?: AuditWriter,
) =>
  appendAuditEntry(
    {
      actorUid: user.uid,
      actorRole: user.profile.role,
      orgId: user.profile.orgId,
    },
    action,
    targetPath,
    details,
    writer,
  );

/**
 * Append an audit entry for work done by a scheduled job rather than a person.
 *
 * Uses the same `actorUid`/`actorRole`/`orgId` = "system" shape the existing
 * scheduled jobs already write (see `notifications.ts`), so these entries stay
 * consistent with the rest of the log. Platform-wide jobs such as the FX
 * refresh belong to no single org, hence `orgId: "system"`.
 */
export const writeSystemAuditLog = (
  action: string,
  targetPath: string,
  details: Record<string, unknown> = {},
) =>
  appendAuditEntry(
    { actorUid: "system", actorRole: "system", orgId: "system" },
    action,
    targetPath,
    details,
  );
