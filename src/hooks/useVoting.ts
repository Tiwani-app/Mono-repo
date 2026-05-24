import {useEffect} from 'react';
import {subscribeToElections, subscribeToPolls} from '../services/votingService';
import {useVotingStore} from '../store/votingStore';

export const useVoting = () => {
  const {setElections, setError, setLoading, setPolls} = useVotingStore();

  useEffect(() => {
    setLoading(true);
    setError(null);
    try {
      const unsubscribePolls = subscribeToPolls(polls => {
        setPolls(polls);
        setError(null);
        setLoading(false);
      });
      const unsubscribeElections = subscribeToElections(elections => {
        setElections(elections);
        setError(null);
        setLoading(false);
      });
      return () => {
        unsubscribePolls();
        unsubscribeElections();
      };
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not load voting data.');
      setLoading(false);
    }
  }, [setElections, setError, setLoading, setPolls]);

  return useVotingStore();
};
