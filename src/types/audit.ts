export interface AuditLog {
  id: string;
  action: string;
  actorRole: string | null;
  actorUid: string | null;
  createdAt: Date;
  details: Record<string, unknown>;
  orgId: string;
  targetPath: string;
}
