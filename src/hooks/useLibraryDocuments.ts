import { useEffect, useRef } from "react";
import { subscribeToLibraryDocuments } from "../services/libraryService";
import { useAuthStore } from "../store/authStore";
import { useLibraryStore } from "../store/libraryStore";
import { isAdmin } from "../utils/roleGuard";
import { getFailureSyncState } from "../utils/syncState";

export const useLibraryDocuments = () => {
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
    setLoading(true);
    setError(null);
    setSyncState("syncing");
    try {
      const unsubscribe = subscribeToLibraryDocuments((nextDocuments) => {
        setDocuments(nextDocuments);
        setLastSyncedAt(new Date());
        setError(null);
        setSyncState("fresh");
        setLoading(false);
      }, includeAdmin);
      return () => unsubscribe();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not load library documents.",
      );
      setSyncState(getFailureSyncState(hasCachedDataRef.current));
      setLoading(false);
    }
  }, [includeAdmin, setDocuments, setError, setLastSyncedAt, setLoading, setSyncState]);

  return useLibraryStore();
};
