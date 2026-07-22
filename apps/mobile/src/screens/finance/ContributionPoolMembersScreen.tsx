import React, { useMemo } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Avatar from "../../components/common/Avatar";
import Badge from "../../components/common/Badge";
import EmptyState from "../../components/common/EmptyState";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ScreenHeader from "../../components/common/ScreenHeader";
import { useContributions } from "../../hooks/useContributions";
import { useMembers } from "../../hooks/useMembers";
import { useAuthStore } from "../../store/authStore";
import { colors, spacing, typography } from "../../theme";
import {
  getContributionTotals,
  getMemberContributionAvailable,
} from "../../utils/contributionTotals";
import { formatCurrency } from "../../utils/formatCurrency";
import { getInitials } from "../../utils/getInitials";
import { safeGoBack } from "../../utils/navigation";
import { isAdmin } from "../../utils/roleGuard";

const ContributionPoolMembersScreen = ({ navigation, route }: any) => {
  const poolId = route.params?.poolId as string;
  const { user } = useAuthStore();
  const admin = isAdmin(user);
  const { entries, error, loading, pools, withdrawRequests } = useContributions(
    undefined,
    admin,
  );
  const { members, loading: membersLoading } = useMembers({ enabled: admin });
  const pool = pools.find((item) => item.id === poolId);

  const memberRows = useMemo(() => {
    const poolEntries = entries.filter((entry) => entry.poolId === poolId);
    const contributorIds = new Set(poolEntries.map((entry) => entry.uid));
    return members
      .filter((member) => contributorIds.has(member.uid))
      .map((member) => {
        const memberEntries = poolEntries.filter(
          (entry) => entry.uid === member.uid,
        );
        const totals = getContributionTotals(memberEntries);
        const available = getMemberContributionAvailable(
          entries,
          withdrawRequests,
          member.uid,
          poolId,
        );
        return { member, totals, available };
      })
      .sort((a, b) => b.totals.totalContributed - a.totals.totalContributed);
  }, [entries, members, poolId, withdrawRequests]);

  if (!admin) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Pool Members"
          showBack
          onBack={() => safeGoBack(navigation, "FinanceAdmin")}
        />
        <EmptyState
          icon="!"
          title="Admin only"
          message="Only admins can view pool members."
        />
      </SafeAreaView>
    );
  }

  if (loading || membersLoading) {
    return <LoadingSpinner />;
  }

  if (error || !pool) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Pool Members"
          showBack
          onBack={() => safeGoBack(navigation, "FinanceAdmin")}
        />
        <EmptyState
          icon="!"
          title="Pool unavailable"
          message={error ?? "This contribution pool could not be found."}
        />
      </SafeAreaView>
    );
  }

  const poolBalance = Math.max(
    0,
    pool.totalContributed - pool.totalWithdrawn,
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title={pool.name}
        showBack
        onBack={() => safeGoBack(navigation, "FinanceAdmin")}
      />
      <FlatList
        data={memberRows}
        keyExtractor={(item) => item.member.uid}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.summary}>
            <Text style={styles.summaryAmount}>
              {formatCurrency(poolBalance)}
            </Text>
            <Text style={styles.summaryMeta}>
              {formatCurrency(pool.totalContributed)} contributed ·{" "}
              {formatCurrency(pool.totalWithdrawn)} withdrawn
            </Text>
            <Text style={styles.sectionLabel}>CONTRIBUTORS</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate("MyContributions", {
                memberId: item.member.uid,
              })
            }
          >
            <Avatar
              initials={getInitials(item.member.fullName)}
              photoURL={item.member.photoURL}
            />
            <View style={styles.copy}>
              <Text style={styles.name}>{item.member.fullName}</Text>
              <Text style={styles.meta}>
                In {formatCurrency(item.totals.totalContributed)} · Out{" "}
                {formatCurrency(item.totals.totalWithdrawn)}
              </Text>
            </View>
            <Badge
              label={formatCurrency(item.available)}
              color={
                item.available > 0
                  ? colors.status.success
                  : colors.text.secondary
              }
            />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="👥"
            title="No contributors yet"
            message="Members appear here after their first contribution is recorded."
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  content: { padding: spacing.lg, gap: spacing.md },
  summary: { gap: spacing.sm, marginBottom: spacing.sm },
  summaryAmount: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.black,
    color: colors.gold.light,
  },
  summaryMeta: { fontSize: typography.size.sm, color: colors.text.secondary },
  sectionLabel: {
    marginTop: spacing.md,
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.8,
  },
  row: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    backgroundColor: colors.bg.card,
  },
  copy: { flex: 1, gap: spacing.xs },
  name: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  meta: { fontSize: typography.size.sm, color: colors.text.secondary },
});

export default ContributionPoolMembersScreen;
