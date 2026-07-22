import { useEffect, useRef, useState } from "react";
import {
  subscribeToContributionPools,
  subscribeToContributions,
  subscribeToWithdrawRequests,
} from "../services/contributionsService";
import {
  ContributionEntry,
  ContributionPool,
  ContributionWithdrawRequest,
} from "../types/contributions";
import { DataSyncState } from "../types/sync";
import {
  getFailureSyncState,
  getSnapshotSyncState,
  shouldUpdateLastSyncedAt,
} from "../utils/syncState";

export const useContributions = (uid?: string, includeAll = false) => {
  const [pools, setPools] = useState<ContributionPool[]>([]);
  const [entries, setEntries] = useState<ContributionEntry[]>([]);
  const [withdrawRequests, setWithdrawRequests] = useState<
    ContributionWithdrawRequest[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncState, setSyncState] = useState<DataSyncState>("idle");
  const hasCachedDataRef = useRef(false);
  const lastSyncedAtRef = useRef(lastSyncedAt);

  hasCachedDataRef.current =
    pools.length > 0 || entries.length > 0 || withdrawRequests.length > 0;
  lastSyncedAtRef.current = lastSyncedAt;

  useEffect(() => {
    let active = true;
    if (!uid && !includeAll) {
      setPools([]);
      setEntries([]);
      setWithdrawRequests([]);
      setError("No member selected for contributions.");
      setSyncState("idle");
      setLoading(false);
      return;
    }

    const memberUid = includeAll ? null : (uid ?? null);
    setLoading(true);
    setError(null);
    setSyncState("syncing");

    let poolsReady = false;
    let entriesReady = false;
    let requestsReady = false;

    const finishLoadingIfReady = () => {
      if (active && poolsReady && entriesReady && requestsReady) {
        setLoading(false);
      }
    };

    const handleError = (contributionError: Error) => {
      if (!active) {
        return;
      }
      setError(
        contributionError.message || "Could not load contribution data.",
      );
      setSyncState(
        getFailureSyncState(contributionError, hasCachedDataRef.current),
      );
      setLoading(false);
    };

    const handleMeta = (meta: Parameters<
      NonNullable<Parameters<typeof subscribeToContributionPools>[2]>
    >[0]) => {
      if (!active) {
        return;
      }
      if (shouldUpdateLastSyncedAt(meta)) {
        setLastSyncedAt(new Date());
      }
      setSyncState(getSnapshotSyncState(meta, lastSyncedAtRef.current));
    };

    try {
      const unsubscribePools = subscribeToContributionPools(
        (nextPools) => {
          if (!active) {
            return;
          }
          setPools(nextPools);
          setError(null);
          poolsReady = true;
          finishLoadingIfReady();
        },
        handleError,
        handleMeta,
      );
      const unsubscribeEntries = subscribeToContributions(
        memberUid,
        (nextEntries) => {
          if (!active) {
            return;
          }
          setEntries(nextEntries);
          setError(null);
          entriesReady = true;
          finishLoadingIfReady();
        },
        handleError,
        handleMeta,
      );
      const unsubscribeRequests = subscribeToWithdrawRequests(
        memberUid,
        (nextRequests) => {
          if (!active) {
            return;
          }
          setWithdrawRequests(nextRequests);
          setError(null);
          requestsReady = true;
          finishLoadingIfReady();
        },
        handleError,
        handleMeta,
      );

      return () => {
        active = false;
        unsubscribePools();
        unsubscribeEntries();
        unsubscribeRequests();
      };
    } catch (contributionError) {
      setError(
        contributionError instanceof Error
          ? contributionError.message
          : "Could not load contribution data.",
      );
      setSyncState(
        getFailureSyncState(contributionError, hasCachedDataRef.current),
      );
      setLoading(false);
    }
  }, [includeAll, uid]);

  const activePool =
    pools.find((pool) => pool.status === "active") ?? null;

  return {
    activePool,
    entries,
    error,
    lastSyncedAt,
    loading,
    pools,
    syncState,
    withdrawRequests,
  };
};
