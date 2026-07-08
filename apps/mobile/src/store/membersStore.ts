import {create} from 'zustand';
import {User} from '../types/user';
import {DataSyncState} from '../types/sync';

interface MembersState {
  members: User[];
  loading: boolean;
  error: string | null;
  syncState: DataSyncState;
  lastSyncedAt: Date | null;
  setMembers: (members: User[]) => void;
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
  setSyncState: (state: DataSyncState) => void;
  setLastSyncedAt: (date: Date | null) => void;
}

export const useMembersStore = create<MembersState>(set => ({
  members: [],
  loading: false,
  error: null,
  syncState: 'idle',
  lastSyncedAt: null,
  setMembers: members => set({members}),
  setLoading: loading => set(state => (state.loading === loading ? state : {loading})),
  setError: error => set(state => (state.error === error ? state : {error})),
  setSyncState: syncState =>
    set(state => (state.syncState === syncState ? state : {syncState})),
  setLastSyncedAt: lastSyncedAt => set({lastSyncedAt}),
}));
