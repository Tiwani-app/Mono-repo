import {useEffect, useRef} from 'react';
import {subscribeToEvents} from '../services/eventsService';
import {useAuthStore} from '../store/authStore';
import {useEventsStore} from '../store/eventsStore';
import {isAdmin} from '../utils/roleGuard';
import {
  getFailureSyncState,
  getSnapshotSyncState,
  shouldUpdateLastSyncedAt,
} from '../utils/syncState';

export const useEvents = () => {
  const {user} = useAuthStore();
  const {
    events,
    lastSyncedAt,
    setEvents,
    setLastSyncedAt,
    setLoading,
    setError,
    setSyncState,
  } = useEventsStore();
  const includeUnpublished = isAdmin(user);
  const hasCachedDataRef = useRef(false);
  const lastSyncedAtRef = useRef(lastSyncedAt);

  hasCachedDataRef.current = events.length > 0;
  lastSyncedAtRef.current = lastSyncedAt;

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSyncState('syncing');
    const handleError = (error: Error) => {
      setError(error.message || 'Could not load events.');
      setSyncState(getFailureSyncState(error, hasCachedDataRef.current));
      setLoading(false);
    };
    try {
      const unsubscribe = subscribeToEvents(nextEvents => {
        setEvents(nextEvents);
        setError(null);
        setLoading(false);
      }, handleError, {includeUnpublished}, meta => {
        if (shouldUpdateLastSyncedAt(meta)) {
          setLastSyncedAt(new Date());
        }
        setSyncState(getSnapshotSyncState(meta, lastSyncedAtRef.current));
      });
      return () => unsubscribe();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not load events.');
      setSyncState(getFailureSyncState(error, hasCachedDataRef.current));
      setLoading(false);
    }
  }, [includeUnpublished, setError, setEvents, setLastSyncedAt, setLoading, setSyncState]);

  return useEventsStore();
};
