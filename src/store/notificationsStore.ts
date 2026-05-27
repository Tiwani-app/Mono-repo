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
  setLoading: loading => set({loading}),
  setError: error => set({error}),
  setSyncState: syncState => set({syncState}),
  setLastSyncedAt: lastSyncedAt => set({lastSyncedAt}),
}));
