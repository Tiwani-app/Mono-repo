import {useEffect} from 'react';
import {subscribeToEvents} from '../services/eventsService';
import {useEventsStore} from '../store/eventsStore';

export const useEvents = () => {
  const {setEvents, setLoading, setError} = useEventsStore();

  useEffect(() => {
    setLoading(true);
    setError(null);
    try {
      const unsubscribe = subscribeToEvents(events => {
        setEvents(events);
        setError(null);
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not load events.');
      setLoading(false);
    }
  }, [setError, setEvents, setLoading]);

  return useEventsStore();
};
