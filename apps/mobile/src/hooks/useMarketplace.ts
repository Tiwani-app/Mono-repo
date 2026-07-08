import {useEffect, useRef} from 'react';
import {subscribeToListings} from '../services/marketplaceService';
import {useMarketplaceStore} from '../store/marketplaceStore';
import {
  getFailureSyncState,
  getSnapshotSyncState,
  shouldUpdateLastSyncedAt,
} from '../utils/syncState';

export const useMarketplace = (includeArchived = false) => {
  const {
    listings,
    lastSyncedAt,
    setError,
    setLastSyncedAt,
    setListings,
    setLoading,
    setSyncState,
  } = useMarketplaceStore();
  const hasCachedDataRef = useRef(false);
  const lastSyncedAtRef = useRef(lastSyncedAt);

  hasCachedDataRef.current = listings.length > 0;
  lastSyncedAtRef.current = lastSyncedAt;

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSyncState('syncing');
    const handleError = (error: Error) => {
      setError(error.message || 'Could not load listings.');
      setSyncState(getFailureSyncState(error, hasCachedDataRef.current));
      setLoading(false);
    };
    try {
      const unsubscribe = subscribeToListings(
        nextListings => {
          setListings(nextListings);
          setError(null);
          setLoading(false);
        },
        includeArchived,
        handleError,
        meta => {
          if (shouldUpdateLastSyncedAt(meta)) {
            setLastSyncedAt(new Date());
          }
          setSyncState(getSnapshotSyncState(meta, lastSyncedAtRef.current));
        },
      );
      return () => unsubscribe();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not load listings.');
      setSyncState(getFailureSyncState(error, hasCachedDataRef.current));
      setLoading(false);
    }
  }, [includeArchived, setError, setLastSyncedAt, setListings, setLoading, setSyncState]);

  return useMarketplaceStore();
};
