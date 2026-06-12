import {useEffect, useRef} from 'react';
import {subscribeToEvents} from '../services/eventsService';
import {useAuthStore} from '../store/authStore';
import {useEventsStore} from '../store/eventsStore';
import {isAdmin} from '../utils/roleGuard';
import {getFailureSyncState} from '../utils/syncState';

export const useEvents = () => {
  const {user} = useAuthStore();
  const {events, setEvents, setLastSyncedAt, setLoading, setError, setSyncState} = useEventsStore();
  const includeUnpublished = isAdmin(user);
  const hasCachedDataRef = useRef(false);

  hasCachedDataRef.current = events.length > 0;

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSyncState('syncing');
    const handleError = (error: Error) => {
      setError(error.message || 'Could not load events.');
      setSyncState(getFailureSyncState(hasCachedDataRef.current));
      setLoading(false);
    };
    try {
      const unsubscribe = subscribeToEvents(nextEvents => {
        setEvents(nextEvents);
        setLastSyncedAt(new Date());
        setError(null);
        setSyncState('fresh');
        setLoading(false);
      }, handleError, {includeUnpublished});
      return () => unsubscribe();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not load events.');
      setSyncState(getFailureSyncState(hasCachedDataRef.current));
      setLoading(false);
    }
  }, [includeUnpublished, setError, setEvents, setLastSyncedAt, setLoading, setSyncState]);

  return useEventsStore();
};
