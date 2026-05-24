import { create } from "zustand";
import { LibraryDocument } from "../types/library";

interface LibraryState {
  documents: LibraryDocument[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  setDocuments: (documents: LibraryDocument[]) => void;
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
}

export const useLibraryStore = create<LibraryState>((set) => ({
  documents: [],
  loading: false,
  error: null,
  searchQuery: "",
  setDocuments: (documents) => set({ documents }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
