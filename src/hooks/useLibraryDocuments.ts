import { useEffect } from "react";
import { subscribeToLibraryDocuments } from "../services/libraryService";
import { useAuthStore } from "../store/authStore";
import { useLibraryStore } from "../store/libraryStore";
import { isAdmin } from "../utils/roleGuard";

export const useLibraryDocuments = () => {
  const { user } = useAuthStore();
  const { setDocuments, setError, setLoading } = useLibraryStore();
  const includeAdmin = isAdmin(user);

  useEffect(() => {
    setLoading(true);
    setError(null);
    try {
      const unsubscribe = subscribeToLibraryDocuments((documents) => {
        setDocuments(documents);
        setError(null);
        setLoading(false);
      }, includeAdmin);
      return () => unsubscribe();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not load library documents.",
      );
      setLoading(false);
    }
  }, [includeAdmin, setDocuments, setError, setLoading]);

  return useLibraryStore();
};
