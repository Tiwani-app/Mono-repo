import { create } from "zustand";
import { LibraryDocument } from "../types/library";
import { DataSyncState } from "../types/sync";

interface LibraryState {
  documents: LibraryDocument[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  syncState: DataSyncState;
  lastSyncedAt: Date | null;
  setDocuments: (documents: LibraryDocument[]) => void;
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSyncState: (state: DataSyncState) => void;
  setLastSyncedAt: (date: Date | null) => void;
}

export const useLibraryStore = create<LibraryState>((set) => ({
  documents: [],
  loading: false,
  error: null,
  searchQuery: "",
  syncState: "idle",
  lastSyncedAt: null,
  setDocuments: (documents) => set({ documents }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSyncState: (syncState) => set({ syncState }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
}));
