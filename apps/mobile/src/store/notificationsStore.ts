import {create} from 'zustand';
import {TiwaniNotification} from '../types/notification';
import {DataSyncState} from '../types/sync';

interface NotificationsState {
  notifications: TiwaniNotification[];
  readIds: string[];
  loading: boolean;
  error: string | null;
  syncState: DataSyncState;
  lastSyncedAt: Date | null;
  setNotifications: (notifications: TiwaniNotification[]) => void;
  setReadIds: (ids: string[]) => void;
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
  setSyncState: (state: DataSyncState) => void;
  setLastSyncedAt: (date: Date | null) => void;
}

export const useNotificationsStore = create<NotificationsState>(set => ({
  notifications: [],
  readIds: [],
  loading: false,
  error: null,
  syncState: 'idle',
  lastSyncedAt: null,
  setNotifications: notifications => set({notifications}),
  setReadIds: readIds => set({readIds}),
  setLoading: loading => set(state => (state.loading === loading ? state : {loading})),
  setError: error => set(state => (state.error === error ? state : {error})),
  setSyncState: syncState =>
    set(state => (state.syncState === syncState ? state : {syncState})),
  setLastSyncedAt: lastSyncedAt => set({lastSyncedAt}),
}));
