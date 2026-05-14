import {create} from 'zustand';
import {Listing} from '../types/marketplace';

interface MarketplaceState {
  listings: Listing[];
  loading: boolean;
  error: string | null;
  setListings: (listings: Listing[]) => void;
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
}

export const useMarketplaceStore = create<MarketplaceState>(set => ({
  listings: [],
  loading: false,
  error: null,
  setListings: listings => set({listings}),
  setLoading: loading => set({loading}),
  setError: error => set({error}),
}));
