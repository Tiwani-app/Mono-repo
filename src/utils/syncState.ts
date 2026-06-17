import {DataSyncSnapshotMeta, DataSyncState} from '../types/sync';

interface FirebaseErrorLike {
  code?: string;
  message?: string;
}

const normalizeErrorCode = (error: unknown): string => {
  if (!error || typeof error !== 'object') {
    return '';
  }
  const rawCode = (error as FirebaseErrorLike).code;
  return typeof rawCode === 'string' ? rawCode.toLowerCase() : '';
};

export const getFailureSyncState = (
  error: unknown,
  hasCachedData: boolean,
): DataSyncState => {
  const code = normalizeErrorCode(error) || '';
  if (
    code.includes('permission-denied') ||
    code.includes('unauthenticated') ||
    code.includes('failed-precondition')
  ) {
    return 'blocked';
  }
  if (
    code.includes('unavailable') ||
    code.includes('network-request-failed') ||
    code.includes('deadline-exceeded')
  ) {
    return hasCachedData ? 'stale' : 'offline';
  }
  return hasCachedData ? 'stale' : 'error';
};

export const getSnapshotSyncState = (
  meta: DataSyncSnapshotMeta,
  lastSyncedAt: Date | null,
): DataSyncState => {
  if (meta.fromCache) {
    return lastSyncedAt ? 'stale' : 'syncing';
  }
  return 'fresh';
};

export const shouldUpdateLastSyncedAt = (meta: DataSyncSnapshotMeta): boolean =>
  !meta.fromCache;
