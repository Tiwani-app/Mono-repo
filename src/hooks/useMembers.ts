import {useEffect} from 'react';
import {subscribeToMembers} from '../services/membersService';
import {useMembersStore} from '../store/membersStore';

export const useMembers = () => {
  const {setMembers, setLoading, setError} = useMembersStore();

  useEffect(() => {
    setLoading(true);
    try {
      const unsubscribe = subscribeToMembers(members => {
        setMembers(members);
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not load members.');
      setLoading(false);
    }
  }, [setError, setLoading, setMembers]);

  return useMembersStore();
};
