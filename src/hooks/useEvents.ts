import {useEffect} from 'react';
import {subscribeToEvents} from '../services/eventsService';
import {useEventsStore} from '../store/eventsStore';

export const useEvents = () => {
  const {setEvents, setLoading, setError} = useEventsStore();

  useEffect(() => {
    setLoading(true);
    try {
      const unsubscribe = subscribeToEvents(events => {
        setEvents(events);
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
