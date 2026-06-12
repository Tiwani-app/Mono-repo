import { useEffect, useRef } from "react";
import { subscribeToLibraryDocuments } from "../services/libraryService";
import { useAuthStore } from "../store/authStore";
import { useLibraryStore } from "../store/libraryStore";
import { isAdmin } from "../utils/roleGuard";
import { getFailureSyncState } from "../utils/syncState";

interface UseLibraryDocumentsOptions {
  enabled?: boolean;
}

export const useLibraryDocuments = ({
  enabled = true,
}: UseLibraryDocumentsOptions = {}) => {
  const { user } = useAuthStore();
  const {
    documents,
    setDocuments,
    setError,
    setLastSyncedAt,
    setLoading,
    setSyncState,
  } = useLibraryStore();
  const includeAdmin = isAdmin(user);
  const hasCachedDataRef = useRef(false);

  hasCachedDataRef.current = documents.length > 0;

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
      setSyncState(getFailureSyncState(hasCachedDataRef.current));
      setLoading(false);
    };
    try {
      const unsubscribe = subscribeToLibraryDocuments((nextDocuments) => {
        setDocuments(nextDocuments);
        setLastSyncedAt(new Date());
        setError(null);
        setSyncState("fresh");
        setLoading(false);
      }, includeAdmin, handleError);
      return () => unsubscribe();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not load library documents.",
      );
      setSyncState(getFailureSyncState(hasCachedDataRef.current));
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
