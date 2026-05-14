import {create} from 'zustand';
import {TiwaniNotification} from '../types/notification';

interface NotificationsState {
  notifications: TiwaniNotification[];
  readIds: string[];
  loading: boolean;
  error: string | null;
  setNotifications: (notifications: TiwaniNotification[]) => void;
  setReadIds: (ids: string[]) => void;
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
}

export const useNotificationsStore = create<NotificationsState>(set => ({
  notifications: [],
  readIds: [],
  loading: false,
  error: null,
  setNotifications: notifications => set({notifications}),
  setReadIds: readIds => set({readIds}),
  setLoading: loading => set({loading}),
  setError: error => set({error}),
}));
