import { useEffect, useRef } from "react";
import { subscribeToLibraryDocuments } from "../services/libraryService";
import { useAuthStore } from "../store/authStore";
import { useLibraryStore } from "../store/libraryStore";
import { isAdmin } from "../utils/roleGuard";
import {
  getFailureSyncState,
  getSnapshotSyncState,
  shouldUpdateLastSyncedAt,
} from "../utils/syncState";

interface UseLibraryDocumentsOptions {
  enabled?: boolean;
}

export const useLibraryDocuments = ({
  enabled = true,
}: UseLibraryDocumentsOptions = {}) => {
  const { user } = useAuthStore();
  const {
    documents,
    lastSyncedAt,
    setDocuments,
    setError,
    setLastSyncedAt,
    setLoading,
    setSyncState,
  } = useLibraryStore();
  const includeAdmin = isAdmin(user);
  const hasCachedDataRef = useRef(false);
  const lastSyncedAtRef = useRef(lastSyncedAt);

  hasCachedDataRef.current = documents.length > 0;
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
      setError(error.message || "Could not load library documents.");
      setSyncState(getFailureSyncState(error, hasCachedDataRef.current));
      setLoading(false);
    };
    try {
      const unsubscribe = subscribeToLibraryDocuments((nextDocuments) => {
        setDocuments(nextDocuments);
        setError(null);
        setLoading(false);
      }, includeAdmin, handleError, meta => {
        if (shouldUpdateLastSyncedAt(meta)) {
          setLastSyncedAt(new Date());
        }
        setSyncState(getSnapshotSyncState(meta, lastSyncedAtRef.current));
      });
      return () => unsubscribe();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not load library documents.",
      );
      setSyncState(getFailureSyncState(error, hasCachedDataRef.current));
      setLoading(false);
    }
  }, [
    enabled,
    includeAdmin,
    setDocuments,
    setError,
    setLastSyncedAt,
    setLoading,
    setSyncState,
  ]);

  return useLibraryStore();
};
