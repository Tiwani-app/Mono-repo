import {useEffect, useRef, useState} from 'react';
import {getDuesPeriods, subscribeToLedger} from '../services/financeService';
import {DuesPeriod, LedgerEntry} from '../types/finance';
import {DataSyncState} from '../types/sync';
import {
  getFailureSyncState,
  getSnapshotSyncState,
  shouldUpdateLastSyncedAt,
} from '../utils/syncState';

export const useFinance = (uid?: string, includeAll = false) => {
  // Finance screens can stay mounted together in the stack, so each subscription
  // keeps local data instead of overwriting one shared ledger/dues cache.
  const [duesPeriods, setDuesPeriods] = useState<DuesPeriod[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncState, setSyncState] = useState<DataSyncState>('idle');
  const hasCachedDataRef = useRef(false);
  const lastSyncedAtRef = useRef(lastSyncedAt);

  hasCachedDataRef.current = ledgerEntries.length > 0;
  lastSyncedAtRef.current = lastSyncedAt;

  useEffect(() => {
    let active = true;
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
    const handleError = (financeError: Error) => {
      if (!active) {
        return;
      }
      setError(financeError.message || 'Could not load finance data.');
      setSyncState(getFailureSyncState(financeError, hasCachedDataRef.current));
      setLoading(false);
    };
    try {
      const unsubscribe = subscribeToLedger(ledgerUid, entries => {
        if (!active) {
          return;
        }
        setLedgerEntries(entries);
        setError(null);
        setLoading(false);
      }, handleError, meta => {
        if (!active) {
          return;
        }
        if (shouldUpdateLastSyncedAt(meta)) {
          setLastSyncedAt(new Date());
        }
        setSyncState(getSnapshotSyncState(meta, lastSyncedAtRef.current));
      });
      if (!includeAll) {
        setDuesPeriods([]);
        return () => {
          active = false;
          unsubscribe();
        };
      }
      getDuesPeriods()
        .then(periods => {
          if (!active) {
            return;
          }
          setDuesPeriods(periods);
          setError(null);
        })
        .catch(handleError);
      return () => {
        active = false;
        unsubscribe();
      };
    } catch (financeError) {
      setError(financeError instanceof Error ? financeError.message : 'Could not load finance data.');
      setSyncState(getFailureSyncState(financeError, hasCachedDataRef.current));
      setLoading(false);
    }
  }, [includeAll, setDuesPeriods, setError, setLastSyncedAt, setLedgerEntries, setLoading, setSyncState, uid]);

  return {
    duesPeriods,
    error,
    lastSyncedAt,
    ledgerEntries,
    loading,
    syncState,
  };
};
