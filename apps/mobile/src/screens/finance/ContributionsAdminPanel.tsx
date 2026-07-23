import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Avatar from "../../components/common/Avatar";
import Badge from "../../components/common/Badge";
import EmptyState from "../../components/common/EmptyState";
import GoldButton from "../../components/common/GoldButton";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import OutlineButton from "../../components/common/OutlineButton";
import SyncStatusBanner from "../../components/common/SyncStatusBanner";
import ContributionPoolCard from "../../components/finance/ContributionPoolCard";
import { useContributions } from "../../hooks/useContributions";
import { useMembers } from "../../hooks/useMembers";
import { closeContributionPool } from "../../services/contributionsService";
import { ContributionPool } from "../../types/contributions";
import { colors, spacing, typography } from "../../theme";
import {
  getContributionTotals,
  getMemberContributionAvailable,
} from "../../utils/contributionTotals";
import { formatCurrency } from "../../utils/formatCurrency";
import { getInitials } from "../../utils/getInitials";

const SummaryTile = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.summaryTile}>
    <Text style={styles.summaryValue}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

interface Props {
  navigation: any;
}

const ContributionsAdminPanel = ({ navigation }: Props) => {
  const {
    activePool,
    entries,
    error,
    lastSyncedAt,
    loading,
    pools,
    syncState,
    withdrawRequests,
  } = useContributions(undefined, true);
  const { members, error: membersError, loading: membersLoading } = useMembers({
    enabled: true,
  });
  const [memberSearch, setMemberSearch] = useState("");
  const [closingPoolId, setClosingPoolId] = useState<string | null>(null);

  const pendingRequests = useMemo(
    () =>
      withdrawRequests.filter(
        (request) =>
          request.status === "pending" || request.status === "approved",
      ),
    [withdrawRequests],
  );

  const totals = useMemo(() => getContributionTotals(entries), [entries]);

  const handleClosePool = (pool: ContributionPool) => {
    if (closingPoolId) {
      return;
    }
    Alert.alert(
      "Close contribution pool",
      `Close "${pool.name}"? Members will no longer be able to contribute or request withdrawals.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Close",
          style: "destructive",
          onPress: async () => {
            try {
              setClosingPoolId(pool.id);
              await closeContributionPool(pool.id);
            } catch (closeError) {
              Alert.alert(
                "Pool not closed",
                closeError instanceof Error
                  ? closeError.message
                  : "Please try again.",
              );
            } finally {
              setClosingPoolId(null);
            }
          },
        },
      ],
    );
  };

  if (loading || membersLoading) {
    return <LoadingSpinner />;
  }

  if (error || membersError) {
    return (
      <EmptyState
        icon="!"
        title="Contributions unavailable"
        message={error ?? membersError ?? "Please try again."}
      />
    );
  }

  const searchQuery = memberSearch.trim().toLowerCase();
  const filteredMembers = searchQuery
    ? members.filter((member) =>
        `${member.fullName} ${member.email} ${member.phone}`
          .toLowerCase()
          .includes(searchQuery),
      )
    : members;

  return (
    <FlatList
      data={filteredMembers}
      keyExtractor={(item) => item.uid}
      initialNumToRender={12}
      windowSize={7}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <>
          <SyncStatusBanner state={syncState} lastSyncedAt={lastSyncedAt} />
          <View style={styles.summaryRow}>
            <SummaryTile
              label="Contributed"
              value={formatCurrency(totals.totalContributed)}
            />
            <SummaryTile
              label="Withdrawn"
              value={formatCurrency(totals.totalWithdrawn)}
            />
            <SummaryTile
              label="Pool balance"
              value={formatCurrency(totals.available)}
            />
          </View>
          <View style={styles.actionGrid}>
            <GoldButton
              label="Record Contribution"
              onPress={() => navigation.navigate("RecordContribution")}
              disabled={!activePool}
            />
            <OutlineButton
              label={activePool ? "New Pool (close current first)" : "New Pool"}
              onPress={() => navigation.navigate("ContributionPoolForm")}
              disabled={Boolean(activePool)}
            />
          </View>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => navigation.navigate("WithdrawRequests")}
            style={styles.requestsButton}
          >
            <View style={styles.requestsCopy}>
              <Text style={styles.requestsTitle}>Withdraw Requests</Text>
              <Text style={styles.requestsMeta}>
                Review, approve, and record payouts.
              </Text>
            </View>
            <Badge
              label={
                pendingRequests.length > 0
                  ? `${pendingRequests.length} OPEN`
                  : "OPEN"
              }
              color={
                pendingRequests.length > 0
                  ? colors.status.error
                  : colors.gold.default
              }
            />
          </TouchableOpacity>
          <Text style={[styles.sectionLabel, { marginBottom: spacing.sm }]}>
            CONTRIBUTION POOLS
          </Text>
          {pools.length === 0 ? (
            <EmptyState
              icon="💰"
              title="No contribution pools"
              message="Create a pool to start recording ajó contributions."
            />
          ) : (
            <View style={styles.poolList}>
              {pools.map((pool) => (
                <ContributionPoolCard
                  key={pool.id}
                  pool={pool}
                  onClose={
                    pool.status === "active" ? handleClosePool : undefined
                  }
                  onPress={() =>
                    navigation.navigate("ContributionPoolMembers", {
                      poolId: pool.id,
                    })
                  }
                />
              ))}
            </View>
          )}
          <Text style={styles.sectionLabel}>MEMBER BALANCES</Text>
          <TextInput
            value={memberSearch}
            onChangeText={setMemberSearch}
            placeholder="Search name, email, or phone"
            placeholderTextColor={colors.text.tertiary}
            style={styles.memberSearch}
            autoCorrect={false}
          />
        </>
      }
      renderItem={({ item }) => {
        const available = getMemberContributionAvailable(
          entries,
          withdrawRequests,
          item.uid,
          activePool?.id,
        );
        return (
          <TouchableOpacity
            style={styles.memberRow}
            onPress={() =>
              navigation.navigate("MyContributions", { memberId: item.uid })
            }
            activeOpacity={0.8}
          >
            <Avatar
              initials={getInitials(item.fullName)}
              photoURL={item.photoURL}
            />
            <View style={styles.memberContent}>
              <Text style={styles.memberName}>{item.fullName}</Text>
              <Text style={styles.memberMeta}>
                Available {formatCurrency(available)}
              </Text>
            </View>
            <Badge
              label={formatCurrency(available)}
              color={
                available > 0 ? colors.status.success : colors.text.secondary
              }
            />
          </TouchableOpacity>
        );
      }}
      ListEmptyComponent={
        <EmptyState
          icon="🔍"
          title={memberSearch ? "No results" : "No members"}
          message={
            memberSearch
              ? "No members match your search."
              : "Members will appear here once they are added."
          }
        />
      }
    />
  );
};

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  summaryRow: { flexDirection: "row", gap: spacing.sm },
  summaryTile: {
    flex: 1,
    minHeight: 78,
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.bg.card,
  },
  summaryValue: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
  },
  summaryLabel: { fontSize: typography.size.xs, color: colors.text.secondary },
  actionGrid: { marginTop: spacing.lg, gap: spacing.sm },
  requestsButton: {
    minHeight: 84,
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gold.default,
    backgroundColor: colors.bg.card,
  },
  requestsCopy: { flex: 1, minWidth: 0 },
  requestsTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
  },
  requestsMeta: {
    marginTop: spacing.xs,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  sectionLabel: {
    marginTop: spacing.lg,
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.8,
  },
  poolList: { gap: spacing.md },
  memberSearch: {
    minHeight: 48,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.tertiary,
    color: colors.text.primary,
  },
  memberRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    backgroundColor: colors.bg.card,
  },
  memberContent: { flex: 1, gap: spacing.xs },
  memberName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  memberMeta: { fontSize: typography.size.sm, color: colors.text.secondary },
});

export default ContributionsAdminPanel;
