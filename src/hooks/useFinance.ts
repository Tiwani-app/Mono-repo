import {useEffect} from 'react';
import {getDuesPeriods, subscribeToLedger} from '../services/financeService';
import {useFinanceStore} from '../store/financeStore';

export const useFinance = (uid?: string, includeAll = false) => {
  const {setDuesPeriods, setError, setLedgerEntries, setLoading} = useFinanceStore();

  useEffect(() => {
    if (!uid && !includeAll) {
      return;
    }
    const ledgerUid = includeAll ? null : uid ?? null;
    setLoading(true);
    setError(null);
    try {
      const unsubscribe = subscribeToLedger(ledgerUid, entries => {
        setLedgerEntries(entries);
        setError(null);
        setLoading(false);
      });
      getDuesPeriods()
        .then(periods => {
          setDuesPeriods(periods);
          setError(null);
        })
        .catch(error => setError(error instanceof Error ? error.message : 'Could not load finance data.'));
      return () => unsubscribe();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not load finance data.');
      setLoading(false);
    }
  }, [includeAll, setDuesPeriods, setError, setLedgerEntries, setLoading, uid]);

  return useFinanceStore();
};
