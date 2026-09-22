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
) => {
  const entry = {
    action,
    actorUid: user.uid,
    actorRole: user.profile.role,
    orgId: user.profile.orgId,
    targetPath,
    details,
    createdAt: FieldValue.serverTimestamp(),
  };
  if (writer) {
    return writer.set(db.collection("audit_logs").doc(), entry);
  }
  return db.collection("audit_logs").add(entry);
};
