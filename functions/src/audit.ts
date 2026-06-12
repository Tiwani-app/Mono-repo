import { FieldValue } from "firebase-admin/firestore";
import { db } from "./firebase";
import { AuthenticatedUser } from "./types";

export const writeAuditLog = (
  user: AuthenticatedUser,
  action: string,
  targetPath: string,
  details: Record<string, unknown> = {},
) =>
  db.collection("audit_logs").add({
    action,
    actorUid: user.uid,
    actorRole: user.profile.role,
    orgId: user.profile.orgId,
    targetPath,
    details,
    createdAt: FieldValue.serverTimestamp(),
  });
