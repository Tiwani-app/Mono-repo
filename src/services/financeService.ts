import {DuesPeriod, LedgerEntry} from '../types/finance';
import {delay, mockDuesPeriods, mockLedger} from './mockData';

export const subscribeToLedger = (uid: string, callback: (entries: LedgerEntry[]) => void) => {
  callback(mockLedger.filter(entry => entry.uid === uid));
  return () => {};
};

export const getAllLedgerEntries = async (): Promise<LedgerEntry[]> => {
  await delay();
  return mockLedger;
};

export const getDuesPeriods = async (): Promise<DuesPeriod[]> => {
  await delay();
  return mockDuesPeriods;
};

export const recordPayment = async (_entryId: string, _amount: number): Promise<void> => {
  await delay();
};

export const createDuesPeriod = async (_data: {
  name: string;
  amount: number;
  dueDate: Date;
}): Promise<void> => {
  await delay();
};
