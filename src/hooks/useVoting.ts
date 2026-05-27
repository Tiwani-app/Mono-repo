import {useEffect, useRef} from 'react';
import {subscribeToElections, subscribeToPolls} from '../services/votingService';
import {useVotingStore} from '../store/votingStore';
import {getFailureSyncState} from '../utils/syncState';

export const useVoting = () => {
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
  const hasCachedDataRef = useRef(false);

  hasCachedDataRef.current = polls.length > 0 || elections.length > 0;

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSyncState('syncing');
    try {
      const unsubscribePolls = subscribeToPolls(nextPolls => {
        setPolls(nextPolls);
        setLastSyncedAt(new Date());
        setError(null);
        setSyncState('fresh');
        setLoading(false);
      });
      const unsubscribeElections = subscribeToElections(nextElections => {
        setElections(nextElections);
        setLastSyncedAt(new Date());
        setError(null);
        setSyncState('fresh');
        setLoading(false);
      });
      return () => {
        unsubscribePolls();
        unsubscribeElections();
      };
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not load voting data.');
      setSyncState(getFailureSyncState(hasCachedDataRef.current));
      setLoading(false);
    }
  }, [setElections, setError, setLastSyncedAt, setLoading, setPolls, setSyncState]);

  return useVotingStore();
};
