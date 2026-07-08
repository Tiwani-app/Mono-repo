import {create} from 'zustand';
import {DuesPeriod, LedgerEntry} from '../types/finance';
import {DataSyncState} from '../types/sync';

interface FinanceState {
  ledgerEntries: LedgerEntry[];
  duesPeriods: DuesPeriod[];
  loading: boolean;
  error: string | null;
  syncState: DataSyncState;
  lastSyncedAt: Date | null;
  setLedgerEntries: (entries: LedgerEntry[]) => void;
  setDuesPeriods: (periods: DuesPeriod[]) => void;
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
  setSyncState: (state: DataSyncState) => void;
  setLastSyncedAt: (date: Date | null) => void;
}

export const useFinanceStore = create<FinanceState>(set => ({
  ledgerEntries: [],
  duesPeriods: [],
  loading: false,
  error: null,
  syncState: 'idle',
  lastSyncedAt: null,
  setLedgerEntries: ledgerEntries => set({ledgerEntries}),
  setDuesPeriods: duesPeriods => set({duesPeriods}),
  setLoading: loading => set(state => (state.loading === loading ? state : {loading})),
  setError: error => set(state => (state.error === error ? state : {error})),
  setSyncState: syncState =>
    set(state => (state.syncState === syncState ? state : {syncState})),
  setLastSyncedAt: lastSyncedAt => set({lastSyncedAt}),
}));
