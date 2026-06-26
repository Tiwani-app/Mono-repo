import {useEffect, useMemo, useRef} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  markNotificationRead,
  subscribeToNotifications,
} from '../services/notificationsService';
import {useNotificationsStore} from '../store/notificationsStore';
import {useAuthStore} from '../store/authStore';
import {
  getAllNotificationIds,
  getNextReadIds,
} from '../utils/notificationHelpers';
import {
  getFailureSyncState,
  getSnapshotSyncState,
  shouldUpdateLastSyncedAt,
} from '../utils/syncState';

const STORAGE_KEY = 'tiwani_read_notifications';

const storageKeyForUser = (uid: string) => `${STORAGE_KEY}:${uid}`;

const parseStoredReadIds = (raw: string | null): string[] => {
  if (!raw) {
    return [];
  }
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed)
    ? parsed.filter((item): item is string => typeof item === 'string')
    : [];
};

export const useNotifications = () => {
  const {user} = useAuthStore();
  const uid = user?.uid;
  const {
    error,
    lastSyncedAt,
    loading,
    notifications,
    readIds,
    setError,
    setLastSyncedAt,
    setLoading,
    setNotifications,
    setReadIds,
    syncState,
    setSyncState,
  } =
    useNotificationsStore();
  const hasCachedDataRef = useRef(false);
  const lastSyncedAtRef = useRef(lastSyncedAt);

  hasCachedDataRef.current = notifications.length > 0;
  lastSyncedAtRef.current = lastSyncedAt;

  const backendReadIds = useMemo(
    () =>
      uid
        ? notifications
            .filter((notification) => notification.readBy.includes(uid))
            .map((notification) => notification.id)
        : [],
    [notifications, uid],
  );

  const effectiveReadIds = useMemo(
    () => Array.from(new Set([...readIds, ...backendReadIds])),
    [backendReadIds, readIds],
  );

  useEffect(() => {
    let active = true;
    if (!uid) {
      setNotifications([]);
      setReadIds([]);
      setError(null);
      setSyncState('idle');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setSyncState('syncing');
    setNotifications([]);
    setReadIds([]);
    AsyncStorage.getItem(storageKeyForUser(uid))
      .then(raw => {
        if (active) {
          setReadIds(parseStoredReadIds(raw));
        }
      })
      .catch(readStateError => {
        if (!active) {
          return;
        }
        setReadIds([]);
        setError(
          readStateError instanceof Error ? readStateError.message : 'Could not load read state.',
        );
      });
    const handleError = (notificationsError: Error) => {
      if (!active) {
        return;
      }
      setError(notificationsError.message || 'Could not load notifications.');
      setSyncState(getFailureSyncState(notificationsError, hasCachedDataRef.current));
      setLoading(false);
    };
    try {
      const unsubscribe = subscribeToNotifications(items => {
        if (!active) {
          return;
        }
        setNotifications(items);
        setError(null);
        setLoading(false);
      }, handleError, meta => {
        if (!active) {
          return;
        }
        if (shouldUpdateLastSyncedAt(meta)) {
          setLastSyncedAt(new Date());
        }
        setSyncState(getSnapshotSyncState(meta, lastSyncedAtRef.current));
      });
      return () => {
        active = false;
        unsubscribe();
      };
    } catch (notificationsError) {
      setError(notificationsError instanceof Error ? notificationsError.message : 'Could not load notifications.');
      setSyncState(getFailureSyncState(notificationsError, hasCachedDataRef.current));
      setLoading(false);
    }
  }, [setError, setLastSyncedAt, setNotifications, setReadIds, setLoading, setSyncState, uid]);

  const persistReadIds = async (ids: string[]) => {
    if (!uid) {
      return;
    }
    setReadIds(ids);
    try {
      await AsyncStorage.setItem(storageKeyForUser(uid), JSON.stringify(ids));
    } catch (readStateError) {
      setError(readStateError instanceof Error ? readStateError.message : 'Could not save read state.');
    }
  };

  const markRead = async (id: string) => {
    await markNotificationRead(id);
    await persistReadIds(getNextReadIds(effectiveReadIds, id));
  };

  const markAllRead = async () => {
    await Promise.all(notifications.map(item => markNotificationRead(item.id)));
    await persistReadIds(getAllNotificationIds(notifications));
  };

  const unreadCount = notifications.filter(item => !effectiveReadIds.includes(item.id)).length;

  return {
    error,
    lastSyncedAt,
    loading,
    markAllRead,
    markRead,
    notifications,
    readIds: effectiveReadIds,
    syncState,
    unreadCount,
  };
};
