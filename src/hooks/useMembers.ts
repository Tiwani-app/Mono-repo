import { useEffect, useRef } from "react";
import { subscribeToMembers } from "../services/membersService";
import { useMembersStore } from "../store/membersStore";
import {
  getFailureSyncState,
  getSnapshotSyncState,
  shouldUpdateLastSyncedAt,
} from "../utils/syncState";

interface UseMembersOptions {
  enabled?: boolean;
}

export const useMembers = ({ enabled = true }: UseMembersOptions = {}) => {
  const {
    members,
    lastSyncedAt,
    setError,
    setLastSyncedAt,
    setLoading,
    setMembers,
    setSyncState,
  } = useMembersStore();
  const hasCachedDataRef = useRef(false);
  const lastSyncedAtRef = useRef(lastSyncedAt);

  hasCachedDataRef.current = members.length > 0;
  lastSyncedAtRef.current = lastSyncedAt;

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
      setSyncState(getFailureSyncState(error, hasCachedDataRef.current));
      setLoading(false);
    };
    try {
      const unsubscribe = subscribeToMembers((nextMembers) => {
        setMembers(nextMembers);
        setError(null);
        setLoading(false);
      }, handleError, meta => {
        if (shouldUpdateLastSyncedAt(meta)) {
          setLastSyncedAt(new Date());
        }
        setSyncState(getSnapshotSyncState(meta, lastSyncedAtRef.current));
      });
      return () => unsubscribe();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not load members.",
      );
      setSyncState(getFailureSyncState(error, hasCachedDataRef.current));
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
