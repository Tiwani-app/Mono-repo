import React, { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Badge from "../../components/common/Badge";
import EmptyState from "../../components/common/EmptyState";
import GoldButton from "../../components/common/GoldButton";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import OutlineButton from "../../components/common/OutlineButton";
import ScreenHeader from "../../components/common/ScreenHeader";
import SyncStatusBanner from "../../components/common/SyncStatusBanner";
import ContributionBalanceBanner from "../../components/finance/ContributionBalanceBanner";
import ContributionLedgerRow from "../../components/finance/ContributionLedgerRow";
import FinanceDomainTabs from "../../components/finance/FinanceDomainTabs";
import { useContributions } from "../../hooks/useContributions";
import { useMembers } from "../../hooks/useMembers";
import { useAuthStore } from "../../store/authStore";
import { colors, spacing, typography } from "../../theme";
import { ContributionWithdrawRequest } from "../../types/contributions";
import {
  getContributionTotals,
  getMemberContributionAvailable,
} from "../../utils/contributionTotals";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDisplayDate } from "../../utils/formatDate";
import { canViewLedgerForMember } from "../../utils/financeGuards";
import { safeGoBack } from "../../utils/navigation";
import { isAdmin } from "../../utils/roleGuard";

const withdrawStatusColor = (status: ContributionWithdrawRequest["status"]) => {
  switch (status) {
    case "pending":
      return colors.gold.default;
    case "approved":
      return colors.status.info;
    case "rejected":
      return colors.status.error;
    case "paid":
      return colors.status.success;
    default:
      return colors.text.secondary;
  }
};

const MyContributionsScreen = ({ navigation, route }: any) => {
  const { user } = useAuthStore();
  const routeMemberId = route.params?.memberId as string | undefined;
  const admin = isAdmin(user);
  const memberId = routeMemberId ?? user?.uid ?? "";
  const viewingOther = Boolean(routeMemberId && routeMemberId !== user?.uid);
  const allowed = canViewLedgerForMember(user, routeMemberId);

  const {
    activePool,
    entries,
    error,
    lastSyncedAt,
    loading,
    syncState,
    withdrawRequests,
  } = useContributions(allowed ? memberId : undefined);
  const { members } = useMembers({ enabled: admin && viewingOther });
  const member = members.find((item) => item.uid === memberId);

  const poolEntries = useMemo(
    () =>
      entries
        .filter((entry) => !activePool || entry.poolId === activePool.id)
        .sort((a, b) => {
          const bTime = (b.paidAt ?? b.createdAt)?.getTime() ?? 0;
          const aTime = (a.paidAt ?? a.createdAt)?.getTime() ?? 0;
          return bTime - aTime;
        }),
    [activePool, entries],
  );

  const totals = useMemo(
    () => getContributionTotals(poolEntries),
    [poolEntries],
  );
  const available = useMemo(
    () =>
      getMemberContributionAvailable(
        entries,
        withdrawRequests,
        memberId,
        activePool?.id,
      ),
    [activePool?.id, entries, memberId, withdrawRequests],
  );

  const openRequest = withdrawRequests.find(
    (request) =>
      (!activePool || request.poolId === activePool.id) &&
      (request.status === "pending" || request.status === "approved"),
  );
  const recentRequests = withdrawRequests
    .filter((request) => !activePool || request.poolId === activePool.id)
    .sort(
      (a, b) =>
        (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
    )
    .slice(0, 5);

  if (!allowed) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Contributions"
          showBack={viewingOther}
          onBack={() => safeGoBack(navigation, "FinanceAdmin")}
        />
        <EmptyState
          icon="!"
          title="Unavailable"
          message="You cannot view this contribution ledger."
        />
      </SafeAreaView>
    );
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Contributions"
          showBack={viewingOther}
          onBack={() => safeGoBack(navigation, "FinanceAdmin")}
        />
        <EmptyState icon="!" title="Contributions unavailable" message={error} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title={
          viewingOther
            ? (member?.fullName ?? "Member contributions")
            : "My Contributions"
        }
        showBack={viewingOther}
        onBack={() => safeGoBack(navigation, "FinanceAdmin")}
      />
      {!viewingOther ? (
        <View style={styles.tabsWrap}>
          <FinanceDomainTabs
            value="contributions"
            onChange={(next) => {
              if (next === "dues") {
                navigation.replace("MyLedger");
              }
            }}
          />
        </View>
      ) : null}
      <FlatList
        data={poolEntries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <SyncStatusBanner state={syncState} lastSyncedAt={lastSyncedAt} />
            {!activePool ? (
              <EmptyState
                icon="💰"
                title="No active pool"
                message="An admin will open a contribution pool when ajó starts."
              />
            ) : (
              <>
                <ContributionBalanceBanner
                  poolName={activePool.name}
                  available={available}
                  contributed={totals.totalContributed}
                  withdrawn={totals.totalWithdrawn}
                />
                {!viewingOther && available > 0 && !openRequest ? (
                  <GoldButton
                    label="Request Withdrawal"
                    onPress={() =>
                      navigation.navigate("RequestWithdrawal", {
                        poolId: activePool.id,
                      })
                    }
                    fullWidth
                  />
                ) : null}
                {admin && viewingOther ? (
                  <OutlineButton
                    label="Record Contribution"
                    onPress={() =>
                      navigation.navigate("RecordContribution", {
                        memberId,
                      })
                    }
                    fullWidth
                  />
                ) : null}
                {openRequest ? (
                  <View style={styles.requestCard}>
                    <Text style={styles.requestTitle}>Open withdrawal</Text>
                    <Text style={styles.requestAmount}>
                      {formatCurrency(openRequest.amount)}
                    </Text>
                    <Badge
                      label={openRequest.status.toUpperCase()}
                      color={withdrawStatusColor(openRequest.status)}
                    />
                    {openRequest.reason ? (
                      <Text style={styles.requestMeta}>{openRequest.reason}</Text>
                    ) : null}
                  </View>
                ) : null}
                {recentRequests.length > 0 ? (
                  <View style={styles.requestHistory}>
                    <Text style={styles.sectionLabel}>RECENT REQUESTS</Text>
                    {recentRequests.map((request) => (
                      <View key={request.id} style={styles.requestRow}>
                        <View style={styles.requestCopy}>
                          <Text style={styles.requestRowAmount}>
                            {formatCurrency(request.amount)}
                          </Text>
                          <Text style={styles.requestMeta}>
                            {request.createdAt
                              ? formatDisplayDate(request.createdAt)
                              : "No date"}
                          </Text>
                        </View>
                        <Badge
                          label={request.status.toUpperCase()}
                          color={withdrawStatusColor(request.status)}
                        />
                      </View>
                    ))}
                  </View>
                ) : null}
                <Text style={styles.sectionLabel}>HISTORY</Text>
              </>
            )}
          </>
        }
        renderItem={({ item }) => <ContributionLedgerRow entry={item} />}
        ListEmptyComponent={
          activePool ? (
            <EmptyState
              icon="📋"
              title="No contributions yet"
              message="When contributions are recorded, they will appear here."
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  tabsWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  content: { padding: spacing.lg, gap: spacing.md },
  sectionLabel: {
    marginTop: spacing.md,
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.8,
  },
  requestCard: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  requestTitle: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  requestAmount: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
  },
  requestMeta: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  requestHistory: { gap: spacing.sm },
  requestRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.bg.card,
  },
  requestCopy: { flex: 1, gap: spacing.xs },
  requestRowAmount: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
});

export default MyContributionsScreen;
