import { useEffect, useState } from "react";
import { subscribeToAccountDeletionRequests } from "../services/membersService";
import { AccountDeletionRequest } from "../types/user";

interface UseAccountDeletionRequestsOptions {
  enabled?: boolean;
}

export const useAccountDeletionRequests = ({
  enabled = true,
}: UseAccountDeletionRequestsOptions = {}) => {
  const [requests, setRequests] = useState<AccountDeletionRequest[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setRequests([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const handleError = (err: Error) => {
      setError(err.message || "Could not load account deletion requests.");
      setLoading(false);
    };
    try {
      const unsubscribe = subscribeToAccountDeletionRequests((items) => {
        setRequests(items);
        setError(null);
        setLoading(false);
      }, handleError);
      return () => unsubscribe();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load account deletion requests.",
      );
      setLoading(false);
    }
  }, [enabled]);

  return { error, loading, requests };
};
