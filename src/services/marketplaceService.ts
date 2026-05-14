import {Listing} from '../types/marketplace';
import {delay, mockListings} from './mockData';

export const subscribeToListings = (callback: (listings: Listing[]) => void) => {
  callback(mockListings.slice(0, 2));
  return () => {};
};

export const createListing = async (
  _data: Omit<Listing, 'id' | 'postedBy' | 'postedByName'>,
): Promise<void> => {
  await delay();
};

export const updateListing = async (_id: string, _data: Partial<Listing>): Promise<void> => {
  await delay();
};

export const deleteListing = async (_id: string): Promise<void> => {
  await delay();
};
