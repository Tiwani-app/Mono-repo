import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Avatar from "../../components/common/Avatar";
import Badge from "../../components/common/Badge";
import EmptyState from "../../components/common/EmptyState";
import FeedbackModal, { FeedbackModalType } from "../../components/common/FeedbackModal";
import Icon from "../../components/common/FeatherIcon";
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
  const [breakdownMetric, setBreakdownMetric] = useState<
    "contributed" | "withdrawn" | "available" | null
  >(null);
  const closeBreakdown = () => setBreakdownMetric(null);
  const [modal, setModal] = useState<{
    visible: boolean;
    type: FeedbackModalType;
    title: string;
    message: string;
    primaryLabel?: string;
    onPrimary: () => void;
    secondaryLabel?: string;
    onSecondary?: () => void;
  } | null>(null);
  const closeModal = () => setModal(null);

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
    setModal({
      visible: true,
      type: "warning",
      title: "Close contribution pool",
      message: `Close "${pool.name}"? Members will no longer be able to contribute or request withdrawals.`,
      primaryLabel: "Close",
      onPrimary: async () => {
        closeModal();
        try {
          setClosingPoolId(pool.id);
          await closeContributionPool(pool.id);
        } catch (closeError) {
          setModal({ visible: true, type: "error", title: "Pool not closed", message: closeError instanceof Error ? closeError.message : "Please try again.", onPrimary: closeModal });
        } finally {
          setClosingPoolId(null);
        }
      },
      secondaryLabel: "Cancel",
      onSecondary: closeModal,
    });
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

  const metricTitle =
    breakdownMetric === "contributed"
      ? "Contributed"
      : breakdownMetric === "withdrawn"
        ? "Withdrawn"
        : "Pool balance";
  const memberNameByUid = new Map(
    members.map((member) => [member.uid, member.fullName]),
  );
  const resolveMemberName = (uid: string) =>
    memberNameByUid.get(uid) ?? `Former member · ${uid.slice(0, 4)}`;
  const personBreakdown = breakdownMetric
    ? Array.from(
        entries
          .reduce((totalsByUid, entry) => {
            const current = totalsByUid.get(entry.uid) ?? {
              contributed: 0,
              withdrawn: 0,
            };
            if (entry.type === "contribution") {
              current.contributed += entry.amount;
            } else if (entry.type === "payout") {
              current.withdrawn += entry.amount;
            }
            totalsByUid.set(entry.uid, current);
            return totalsByUid;
          }, new Map<string, { contributed: number; withdrawn: number }>())
          .entries(),
      )
        .map(([uid, memberTotals]) => ({
          uid,
          amount:
            breakdownMetric === "contributed"
              ? memberTotals.contributed
              : breakdownMetric === "withdrawn"
                ? memberTotals.withdrawn
                : memberTotals.contributed - memberTotals.withdrawn,
        }))
        .filter((row) => row.amount > 0)
        .sort((left, right) => right.amount - left.amount)
    : [];
  const breakdownTotal =
    breakdownMetric === "contributed"
      ? totals.totalContributed
      : breakdownMetric === "withdrawn"
        ? totals.totalWithdrawn
        : totals.available;

  const list = (
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
          <View style={styles.heroCard}>
            <TouchableOpacity
              style={styles.heroMain}
              activeOpacity={0.85}
              onPress={() => setBreakdownMetric("available")}
            >
              <Text style={styles.heroLabel}>Pool balance</Text>
              <Text style={styles.heroValue}>
                {formatCurrency(totals.available)}
              </Text>
            </TouchableOpacity>
            <View style={styles.heroDivider} />
            <View style={styles.heroSplitRow}>
              <TouchableOpacity
                style={styles.heroStat}
                activeOpacity={0.85}
                onPress={() => setBreakdownMetric("contributed")}
              >
                <Text style={styles.heroStatLabel}>Contributed</Text>
                <Text style={styles.heroStatValue}>
                  {formatCurrency(totals.totalContributed)}
                </Text>
              </TouchableOpacity>
              <View style={styles.heroStatDivider} />
              <TouchableOpacity
                style={styles.heroStat}
                activeOpacity={0.85}
                onPress={() => setBreakdownMetric("withdrawn")}
              >
                <Text style={styles.heroStatLabel}>Withdrawn</Text>
                <Text style={styles.heroStatValue}>
                  {formatCurrency(totals.totalWithdrawn)}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.heroHint}>
              Tap any figure for a breakdown by member
            </Text>
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

  return (
    <>
      {modal && (
        <FeedbackModal
          visible={modal.visible}
          type={modal.type}
          title={modal.title}
          message={modal.message}
          primaryLabel={modal.primaryLabel}
          onPrimary={modal.onPrimary}
          secondaryLabel={modal.secondaryLabel}
          onSecondary={modal.onSecondary}
        />
      )}
      <Modal
        visible={breakdownMetric !== null}
        transparent
        animationType="slide"
        onRequestClose={closeBreakdown}
      >
        <View style={styles.breakdownBackdrop}>
          <View style={styles.breakdownSheet}>
            <View style={styles.breakdownHeader}>
              <Text style={styles.breakdownTitle} numberOfLines={1}>
                {metricTitle} by member
              </Text>
              <TouchableOpacity
                style={styles.breakdownClose}
                onPress={closeBreakdown}
                activeOpacity={0.8}
              >
                <Icon name="x" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.breakdownScroll}
              contentContainerStyle={styles.breakdownScrollContent}
            >
              {personBreakdown.length > 0 ? (
                personBreakdown.map((row) => (
                  <View key={row.uid} style={styles.breakdownRow}>
                    <Text style={styles.breakdownRowLabel} numberOfLines={1}>
                      {resolveMemberName(row.uid)}
                    </Text>
                    <Text style={styles.breakdownRowValue}>
                      {formatCurrency(row.amount)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.breakdownEmpty}>
                  No members for this figure.
                </Text>
              )}
            </ScrollView>
            <View style={styles.breakdownTotalRow}>
              <Text style={styles.breakdownTotalLabel}>Total</Text>
              <Text style={styles.breakdownTotalValue}>
                {formatCurrency(breakdownTotal)}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
      {list}
    </>
  );
};

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  heroCard: {
    marginTop: spacing.xs,
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.gold.default,
    gap: spacing.md,
  },
  heroMain: { gap: spacing.xs },
  heroLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: "rgba(5,12,7,0.7)",
    letterSpacing: 0.3,
  },
  heroValue: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: typography.weight.black,
    color: colors.text.onGold,
  },
  heroDivider: { height: 1, backgroundColor: "rgba(5,12,7,0.15)" },
  heroSplitRow: { flexDirection: "row", alignItems: "center" },
  heroStat: { flex: 1, gap: spacing.xs },
  heroStatDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "rgba(5,12,7,0.15)",
    marginHorizontal: spacing.md,
  },
  heroStatLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: "rgba(5,12,7,0.7)",
  },
  heroStatValue: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.onGold,
  },
  heroHint: { fontSize: typography.size.xs, color: "rgba(5,12,7,0.6)" },
  breakdownBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  breakdownSheet: {
    gap: spacing.xs,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: colors.bg.secondary,
  },
  breakdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  breakdownTitle: {
    flex: 1,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  breakdownClose: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: colors.bg.card,
  },
  breakdownScroll: { maxHeight: 400 },
  breakdownScrollContent: { gap: spacing.xs },
  breakdownRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.bg.card,
  },
  breakdownRowLabel: {
    flex: 1,
    marginRight: spacing.md,
    fontSize: typography.size.base,
    color: colors.text.primary,
  },
  breakdownRowValue: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  breakdownTotalRow: {
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  breakdownTotalLabel: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.text.secondary,
  },
  breakdownTotalValue: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.black,
    color: colors.gold.light,
  },
  breakdownEmpty: {
    paddingVertical: spacing.md,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: "center",
  },
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
