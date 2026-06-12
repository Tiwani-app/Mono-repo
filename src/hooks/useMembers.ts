import { useEffect, useRef } from "react";
import { subscribeToMembers } from "../services/membersService";
import { useMembersStore } from "../store/membersStore";
import { getFailureSyncState } from "../utils/syncState";

interface UseMembersOptions {
  enabled?: boolean;
}

export const useMembers = ({ enabled = true }: UseMembersOptions = {}) => {
  const {
    members,
    setError,
    setLastSyncedAt,
    setLoading,
    setMembers,
    setSyncState,
  } = useMembersStore();
  const hasCachedDataRef = useRef(false);

  hasCachedDataRef.current = members.length > 0;

  useEffect(() => {
    if (!enabled) {
      setError(null);
      setLoading(false);
      setSyncState("idle");
      return;
    }

    setLoading(true);
    setError(null);
    setSyncState("syncing");
    const handleError = (error: Error) => {
      setError(error.message || "Could not load members.");
      setSyncState(getFailureSyncState(hasCachedDataRef.current));
      setLoading(false);
    };
    try {
      const unsubscribe = subscribeToMembers((nextMembers) => {
        setMembers(nextMembers);
        setLastSyncedAt(new Date());
        setError(null);
        setSyncState("fresh");
        setLoading(false);
      }, handleError);
      return () => unsubscribe();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not load members.",
      );
      setSyncState(getFailureSyncState(hasCachedDataRef.current));
      setLoading(false);
    }
  }, [
    enabled,
    setError,
    setLastSyncedAt,
    setLoading,
    setMembers,
    setSyncState,
  ]);

  return useMembersStore();
};
