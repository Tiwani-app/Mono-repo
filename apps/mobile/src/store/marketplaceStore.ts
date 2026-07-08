import {create} from 'zustand';
import {Listing} from '../types/marketplace';
import {DataSyncState} from '../types/sync';

interface MarketplaceState {
  listings: Listing[];
  loading: boolean;
  error: string | null;
  syncState: DataSyncState;
  lastSyncedAt: Date | null;
  setListings: (listings: Listing[]) => void;
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
  setSyncState: (state: DataSyncState) => void;
  setLastSyncedAt: (date: Date | null) => void;
}

export const useMarketplaceStore = create<MarketplaceState>(set => ({
  listings: [],
  loading: false,
  error: null,
  syncState: 'idle',
  lastSyncedAt: null,
  setListings: listings => set({listings}),
  setLoading: loading => set({loading}),
  setError: error => set({error}),
  setSyncState: syncState => set({syncState}),
  setLastSyncedAt: lastSyncedAt => set({lastSyncedAt}),
}));
