import {useEffect, useRef} from 'react';
import {getDuesPeriods, subscribeToLedger} from '../services/financeService';
import {useFinanceStore} from '../store/financeStore';
import {getFailureSyncState} from '../utils/syncState';

export const useFinance = (uid?: string, includeAll = false) => {
  const {
    ledgerEntries,
    setDuesPeriods,
    setError,
    setLastSyncedAt,
    setLedgerEntries,
    setLoading,
    setSyncState,
  } = useFinanceStore();
  const hasCachedDataRef = useRef(false);

  hasCachedDataRef.current = ledgerEntries.length > 0;

  useEffect(() => {
    if (!uid && !includeAll) {
      setLedgerEntries([]);
      setDuesPeriods([]);
      setError('No member selected for this ledger.');
      setSyncState('idle');
      setLoading(false);
      return;
    }
    const ledgerUid = includeAll ? null : uid ?? null;
    setLoading(true);
    setError(null);
    setSyncState('syncing');
    try {
      const unsubscribe = subscribeToLedger(ledgerUid, entries => {
        setLedgerEntries(entries);
        setLastSyncedAt(new Date());
        setError(null);
        setSyncState('fresh');
        setLoading(false);
      });
      getDuesPeriods()
        .then(periods => {
          setDuesPeriods(periods);
          setLastSyncedAt(new Date());
          setError(null);
          setSyncState('fresh');
        })
        .catch(error => {
          setError(error instanceof Error ? error.message : 'Could not load finance data.');
          setSyncState(getFailureSyncState(hasCachedDataRef.current));
        });
      return () => unsubscribe();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not load finance data.');
      setSyncState(getFailureSyncState(hasCachedDataRef.current));
      setLoading(false);
    }
  }, [includeAll, setDuesPeriods, setError, setLastSyncedAt, setLedgerEntries, setLoading, setSyncState, uid]);

  return useFinanceStore();
};
