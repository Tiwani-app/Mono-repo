import {useEffect, useRef} from 'react';
import {subscribeToMembers} from '../services/membersService';
import {useMembersStore} from '../store/membersStore';
import {getFailureSyncState} from '../utils/syncState';

export const useMembers = () => {
  const {members, setError, setLastSyncedAt, setLoading, setMembers, setSyncState} = useMembersStore();
  const hasCachedDataRef = useRef(false);

  hasCachedDataRef.current = members.length > 0;

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSyncState('syncing');
    try {
      const unsubscribe = subscribeToMembers(nextMembers => {
        setMembers(nextMembers);
        setLastSyncedAt(new Date());
        setError(null);
        setSyncState('fresh');
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not load members.');
      setSyncState(getFailureSyncState(hasCachedDataRef.current));
      setLoading(false);
    }
  }, [setError, setLastSyncedAt, setLoading, setMembers, setSyncState]);

  return useMembersStore();
};
