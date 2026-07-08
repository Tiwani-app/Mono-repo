import { useEffect, useState } from "react";
import { subscribeToAuditLogs } from "../services/auditService";
import { AuditLog } from "../types/audit";

interface UseAuditLogsOptions {
  enabled?: boolean;
}

export const useAuditLogs = ({
  enabled = true,
}: UseAuditLogsOptions = {}) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLogs([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const unsubscribe = subscribeToAuditLogs(
      (items) => {
        setLogs(items);
        setError(null);
        setLoading(false);
      },
      (nextError) => {
        setError(nextError.message || "Could not load audit logs.");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [enabled]);

  return { error, loading, logs };
};
