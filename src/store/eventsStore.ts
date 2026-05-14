import {create} from 'zustand';
import {TiwaniEvent} from '../types/event';

interface EventsState {
  events: TiwaniEvent[];
  selectedEvent: TiwaniEvent | null;
  loading: boolean;
  error: string | null;
  setEvents: (events: TiwaniEvent[]) => void;
  setSelectedEvent: (event: TiwaniEvent | null) => void;
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
}

export const useEventsStore = create<EventsState>(set => ({
  events: [],
  selectedEvent: null,
  loading: false,
  error: null,
  setEvents: events => set({events}),
  setSelectedEvent: selectedEvent => set({selectedEvent}),
  setLoading: loading => set({loading}),
  setError: error => set({error}),
}));
