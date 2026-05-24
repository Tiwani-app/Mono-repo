import {useEffect} from 'react';
import {subscribeToListings} from '../services/marketplaceService';
import {useMarketplaceStore} from '../store/marketplaceStore';

export const useMarketplace = () => {
  const {setError, setListings, setLoading} = useMarketplaceStore();

  useEffect(() => {
    setLoading(true);
    setError(null);
    try {
      const unsubscribe = subscribeToListings(listings => {
        setListings(listings);
        setError(null);
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not load listings.');
      setLoading(false);
    }
  }, [setError, setListings, setLoading]);

  return useMarketplaceStore();
};
