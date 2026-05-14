import {useEffect} from 'react';
import {getDuesPeriods, subscribeToLedger} from '../services/financeService';
import {useFinanceStore} from '../store/financeStore';

export const useFinance = (uid?: string) => {
  const {setDuesPeriods, setError, setLedgerEntries, setLoading} = useFinanceStore();

  useEffect(() => {
    if (!uid) {
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeToLedger(uid, entries => {
      setLedgerEntries(entries);
      setLoading(false);
    });
    getDuesPeriods()
      .then(setDuesPeriods)
      .catch(error => setError(error instanceof Error ? error.message : 'Could not load finance data.'));
    return () => unsubscribe();
  }, [setDuesPeriods, setError, setLedgerEntries, setLoading, uid]);

  return useFinanceStore();
};
