import {useEffect, useState} from 'react';
import {subscribeToJoinRequests} from '../services/membersService';
import {JoinRequest} from '../types/user';

export const useJoinRequests = () => {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    try {
      const unsubscribe = subscribeToJoinRequests(items => {
        setRequests(items);
        setError(null);
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load join requests.');
      setLoading(false);
    }
  }, []);

  return {requests, loading, error};
};
