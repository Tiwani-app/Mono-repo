import {useEffect, useRef} from 'react';
import {getDuesPeriods, subscribeToLedger} from '../services/financeService';
import {useFinanceStore} from '../store/financeStore';
import {
  getFailureSyncState,
  getSnapshotSyncState,
  shouldUpdateLastSyncedAt,
} from '../utils/syncState';

export const useFinance = (uid?: string, includeAll = false) => {
  const {
    ledgerEntries,
    lastSyncedAt,
    setDuesPeriods,
    setError,
    setLastSyncedAt,
    setLedgerEntries,
    setLoading,
    setSyncState,
  } = useFinanceStore();
  const hasCachedDataRef = useRef(false);
  const lastSyncedAtRef = useRef(lastSyncedAt);

  hasCachedDataRef.current = ledgerEntries.length > 0;
  lastSyncedAtRef.current = lastSyncedAt;

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
    const handleError = (error: Error) => {
      setError(error.message || 'Could not load finance data.');
      setSyncState(getFailureSyncState(error, hasCachedDataRef.current));
      setLoading(false);
    };
    try {
      const unsubscribe = subscribeToLedger(ledgerUid, entries => {
        setLedgerEntries(entries);
        setError(null);
        setLoading(false);
      }, handleError, meta => {
        if (shouldUpdateLastSyncedAt(meta)) {
          setLastSyncedAt(new Date());
        }
        setSyncState(getSnapshotSyncState(meta, lastSyncedAtRef.current));
      });
      if (!includeAll) {
        setDuesPeriods([]);
        return () => unsubscribe();
      }
      getDuesPeriods()
        .then(periods => {
          setDuesPeriods(periods);
          setError(null);
        })
        .catch(handleError);
      return () => unsubscribe();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not load finance data.');
      setSyncState(getFailureSyncState(error, hasCachedDataRef.current));
      setLoading(false);
    }
  }, [includeAll, setDuesPeriods, setError, setLastSyncedAt, setLedgerEntries, setLoading, setSyncState, uid]);

  return useFinanceStore();
};
