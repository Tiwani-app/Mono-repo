import {useEffect, useRef} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {subscribeToNotifications} from '../services/notificationsService';
import {useNotificationsStore} from '../store/notificationsStore';
import {
  getAllNotificationIds,
  getNextReadIds,
} from '../utils/notificationHelpers';
import {getFailureSyncState} from '../utils/syncState';

const STORAGE_KEY = 'tiwani_read_notifications';

export const useNotifications = () => {
  const {
    notifications,
    readIds,
    setError,
    setLastSyncedAt,
    setLoading,
    setNotifications,
    setReadIds,
    setSyncState,
  } =
    useNotificationsStore();
  const hasCachedDataRef = useRef(false);

  hasCachedDataRef.current = notifications.length > 0;

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSyncState('syncing');
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => setReadIds(raw ? JSON.parse(raw) : []))
      .catch(error => {
        setReadIds([]);
        setError(
          error instanceof Error ? error.message : 'Could not load read state.',
        );
      });
    try {
      const unsubscribe = subscribeToNotifications(items => {
        setNotifications(items);
        setLastSyncedAt(new Date());
        setError(null);
        setSyncState('fresh');
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not load notifications.');
      setSyncState(getFailureSyncState(hasCachedDataRef.current));
      setLoading(false);
    }
  }, [setError, setLastSyncedAt, setNotifications, setReadIds, setLoading, setSyncState]);

  const persistReadIds = async (ids: string[]) => {
    setReadIds(ids);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not save read state.');
    }
  };

  const markRead = async (id: string) => {
    await persistReadIds(getNextReadIds(readIds, id));
  };

  const markAllRead = async () => {
    await persistReadIds(getAllNotificationIds(notifications));
  };

  const unreadCount = notifications.filter(item => !readIds.includes(item.id)).length;

  return {...useNotificationsStore(), markAllRead, markRead, unreadCount};
};
