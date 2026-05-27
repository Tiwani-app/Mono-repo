export type DataSyncState = 'idle' | 'syncing' | 'fresh' | 'stale' | 'offline';

export interface SyncMetadata {
  syncState: DataSyncState;
  lastSyncedAt: Date | null;
}

