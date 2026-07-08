export type DataSyncState =
  | 'idle'
  | 'syncing'
  | 'fresh'
  | 'stale'
  | 'offline'
  | 'blocked'
  | 'error';

export interface DataSyncSnapshotMeta {
  fromCache: boolean;
  hasPendingWrites: boolean;
}
