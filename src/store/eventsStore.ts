import {create} from 'zustand';
import {TiwaniEvent} from '../types/event';
import {DataSyncState} from '../types/sync';

interface EventsState {
  events: TiwaniEvent[];
  loading: boolean;
  error: string | null;
  syncState: DataSyncState;
  lastSyncedAt: Date | null;
  setEvents: (events: TiwaniEvent[]) => void;
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
  setSyncState: (state: DataSyncState) => void;
  setLastSyncedAt: (date: Date | null) => void;
}

export const useEventsStore = create<EventsState>(set => ({
  events: [],
  loading: false,
  error: null,
  syncState: 'idle',
  lastSyncedAt: null,
  setEvents: events => set({events}),
  setLoading: loading => set({loading}),
  setError: error => set({error}),
  setSyncState: syncState => set({syncState}),
  setLastSyncedAt: lastSyncedAt => set({lastSyncedAt}),
}));
