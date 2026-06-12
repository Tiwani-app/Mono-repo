import {useEffect, useRef} from 'react';
import {subscribeToListings} from '../services/marketplaceService';
import {useMarketplaceStore} from '../store/marketplaceStore';
import {getFailureSyncState} from '../utils/syncState';

export const useMarketplace = (includeArchived = false) => {
  const {listings, setError, setLastSyncedAt, setListings, setLoading, setSyncState} = useMarketplaceStore();
  const hasCachedDataRef = useRef(false);

  hasCachedDataRef.current = listings.length > 0;

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSyncState('syncing');
    const handleError = (error: Error) => {
      setError(error.message || 'Could not load listings.');
      setSyncState(getFailureSyncState(hasCachedDataRef.current));
      setLoading(false);
    };
    try {
      const unsubscribe = subscribeToListings(
        nextListings => {
          setListings(nextListings);
          setLastSyncedAt(new Date());
          setError(null);
          setSyncState('fresh');
          setLoading(false);
        },
        includeArchived,
        handleError,
      );
      return () => unsubscribe();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not load listings.');
      setSyncState(getFailureSyncState(hasCachedDataRef.current));
      setLoading(false);
    }
  }, [includeArchived, setError, setLastSyncedAt, setListings, setLoading, setSyncState]);

  return useMarketplaceStore();
};
