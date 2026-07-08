import {create} from 'zustand';
import {User} from '../types/user';
import {DataSyncState} from '../types/sync';

interface MembersState {
  members: User[];
  searchQuery: string;
  loading: boolean;
  error: string | null;
  syncState: DataSyncState;
  lastSyncedAt: Date | null;
  setMembers: (members: User[]) => void;
  setSearchQuery: (query: string) => void;
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
  setSyncState: (state: DataSyncState) => void;
  setLastSyncedAt: (date: Date | null) => void;
}

export const useMembersStore = create<MembersState>(set => ({
  members: [],
  searchQuery: '',
  loading: false,
  error: null,
  syncState: 'idle',
  lastSyncedAt: null,
  setMembers: members => set({members}),
  setSearchQuery: searchQuery => set({searchQuery}),
  setLoading: loading => set({loading}),
  setError: error => set({error}),
  setSyncState: syncState => set({syncState}),
  setLastSyncedAt: lastSyncedAt => set({lastSyncedAt}),
}));
