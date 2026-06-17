import {useEffect, useRef} from 'react';
import {subscribeToElections, subscribeToPolls} from '../services/votingService';
import {useAuthStore} from '../store/authStore';
import {useVotingStore} from '../store/votingStore';
import {isAdmin} from '../utils/roleGuard';
import {
  getFailureSyncState,
  getSnapshotSyncState,
  shouldUpdateLastSyncedAt,
} from '../utils/syncState';

export const useVoting = () => {
  const {user} = useAuthStore();
  const {
    elections,
    polls,
    lastSyncedAt,
    setElections,
    setError,
    setLastSyncedAt,
    setLoading,
    setPolls,
    setSyncState,
  } = useVotingStore();
  const includeDrafts = isAdmin(user);
  const hasCachedDataRef = useRef(false);
  const lastSyncedAtRef = useRef(lastSyncedAt);

  hasCachedDataRef.current = polls.length > 0 || elections.length > 0;
  lastSyncedAtRef.current = lastSyncedAt;

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSyncState('syncing');
    const handleError = (error: Error) => {
      setError(error.message || 'Could not load voting data.');
      setSyncState(getFailureSyncState(error, hasCachedDataRef.current));
      setLoading(false);
    };
    try {
      const unsubscribePolls = subscribeToPolls(nextPolls => {
        setPolls(nextPolls);
        setError(null);
        setLoading(false);
      }, handleError, {includeDrafts}, meta => {
        if (shouldUpdateLastSyncedAt(meta)) {
          setLastSyncedAt(new Date());
        }
        setSyncState(getSnapshotSyncState(meta, lastSyncedAtRef.current));
      });
      const unsubscribeElections = subscribeToElections(nextElections => {
        setElections(nextElections);
        setError(null);
        setLoading(false);
      }, handleError, {includeDrafts}, meta => {
        if (shouldUpdateLastSyncedAt(meta)) {
          setLastSyncedAt(new Date());
        }
        setSyncState(getSnapshotSyncState(meta, lastSyncedAtRef.current));
      });
      return () => {
        unsubscribePolls();
        unsubscribeElections();
      };
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not load voting data.');
      setSyncState(getFailureSyncState(error, hasCachedDataRef.current));
      setLoading(false);
    }
  }, [includeDrafts, setElections, setError, setLastSyncedAt, setLoading, setPolls, setSyncState]);

  return useVotingStore();
};
