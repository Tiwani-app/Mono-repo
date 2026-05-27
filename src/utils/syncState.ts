import {DataSyncState} from '../types/sync';

export const getFailureSyncState = (hasCachedData: boolean): DataSyncState =>
  hasCachedData ? 'stale' : 'offline';

