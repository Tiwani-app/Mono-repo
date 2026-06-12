import {useEffect, useRef} from 'react';
import {subscribeToElections, subscribeToPolls} from '../services/votingService';
import {useAuthStore} from '../store/authStore';
import {useVotingStore} from '../store/votingStore';
import {isAdmin} from '../utils/roleGuard';
import {getFailureSyncState} from '../utils/syncState';

export const useVoting = () => {
  const {user} = useAuthStore();
  const {
    elections,
    polls,
    setElections,
    setError,
    setLastSyncedAt,
    setLoading,
    setPolls,
    setSyncState,
  } = useVotingStore();
  const includeDrafts = isAdmin(user);
  const hasCachedDataRef = useRef(false);

  hasCachedDataRef.current = polls.length > 0 || elections.length > 0;

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSyncState('syncing');
    const handleError = (error: Error) => {
      setError(error.message || 'Could not load voting data.');
      setSyncState(getFailureSyncState(hasCachedDataRef.current));
      setLoading(false);
    };
    try {
      const unsubscribePolls = subscribeToPolls(nextPolls => {
        setPolls(nextPolls);
        setLastSyncedAt(new Date());
        setError(null);
        setSyncState('fresh');
        setLoading(false);
      }, handleError, {includeDrafts});
      const unsubscribeElections = subscribeToElections(nextElections => {
        setElections(nextElections);
        setLastSyncedAt(new Date());
        setError(null);
        setSyncState('fresh');
        setLoading(false);
      }, handleError, {includeDrafts});
      return () => {
        unsubscribePolls();
        unsubscribeElections();
      };
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not load voting data.');
      setSyncState(getFailureSyncState(hasCachedDataRef.current));
      setLoading(false);
    }
  }, [includeDrafts, setElections, setError, setLastSyncedAt, setLoading, setPolls, setSyncState]);

  return useVotingStore();
};
