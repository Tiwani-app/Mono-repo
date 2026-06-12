import { useEffect, useState } from "react";
import { subscribeToJoinRequests } from "../services/membersService";
import { JoinRequest } from "../types/user";

interface UseJoinRequestsOptions {
  enabled?: boolean;
}

export const useJoinRequests = ({
  enabled = true,
}: UseJoinRequestsOptions = {}) => {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
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
      setError(err.message || "Could not load join requests.");
      setLoading(false);
    };
    try {
      const unsubscribe = subscribeToJoinRequests((items) => {
        setRequests(items);
        setError(null);
        setLoading(false);
      }, handleError);
      return () => unsubscribe();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load join requests.",
      );
      setLoading(false);
    }
  }, [enabled]);

  return { requests, loading, error };
};
