import {create} from 'zustand';
import {DuesPeriod, LedgerEntry} from '../types/finance';

interface FinanceState {
  ledgerEntries: LedgerEntry[];
  duesPeriods: DuesPeriod[];
  loading: boolean;
  error: string | null;
  setLedgerEntries: (entries: LedgerEntry[]) => void;
  setDuesPeriods: (periods: DuesPeriod[]) => void;
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
}

export const useFinanceStore = create<FinanceState>(set => ({
  ledgerEntries: [],
  duesPeriods: [],
  loading: false,
  error: null,
  setLedgerEntries: ledgerEntries => set({ledgerEntries}),
  setDuesPeriods: duesPeriods => set({duesPeriods}),
  setLoading: loading => set({loading}),
  setError: error => set({error}),
}));
