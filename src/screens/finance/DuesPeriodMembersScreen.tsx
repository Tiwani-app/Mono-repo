import React, { useMemo } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Avatar from "../../components/common/Avatar";
import Badge from "../../components/common/Badge";
import EmptyState from "../../components/common/EmptyState";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ScreenHeader from "../../components/common/ScreenHeader";
import { useFinance } from "../../hooks/useFinance";
import { useMembers } from "../../hooks/useMembers";
import { useAuthStore } from "../../store/authStore";
import { colors, spacing, typography } from "../../theme";
import { LedgerPaidStatus } from "../../types/finance";
import { formatCurrency } from "../../utils/formatCurrency";
import {
  getChargeAmountPaid,
  getChargeOutstanding,
} from "../../utils/financeTotals";
import { getInitials } from "../../utils/getInitials";
import { safeGoBack } from "../../utils/navigation";
import { isAdmin } from "../../utils/roleGuard";

type MemberDuesRow = {
  amount: number;
  amountPaid: number;
  dueDate: Date | null;
  fullName: string;
  outstanding: number;
  paidStatus: LedgerPaidStatus;
  photoURL?: string | null;
  uid: string;
};

const statusColor = (status: LedgerPaidStatus) =>
  status === "paid"
    ? colors.status.success
    : status === "partial"
      ? colors.gold.default
      : colors.status.error;

const statusLabel = (status: LedgerPaidStatus) =>
  status === "paid" ? "PAID" : status === "partial" ? "PARTIAL" : "UNPAID";

const resolveStatus = (amount: number, amountPaid: number): LedgerPaidStatus => {
  if (amountPaid >= amount && amount > 0) {
    return "paid";
  }
  return amountPaid > 0 ? "partial" : "unpaid";
};

const DuesPeriodMembersScreen = ({ navigation, route }: any) => {
  const periodId = route.params?.duesPeriodId as string | undefined;
  const { user } = useAuthStore();
  const admin = isAdmin(user);
  const {
    duesPeriods,
    error: financeError,
    ledgerEntries,
    loading: financeLoading,
  } = useFinance(undefined, admin);
  const {
    error: membersError,
    loading: membersLoading,
    members,
  } = useMembers({ enabled: admin });

  const period = duesPeriods.find((item) => item.id === periodId);

  const rows = useMemo(() => {
    if (!period) {
      return [];
    }
    const memberById = new Map(members.map((member) => [member.uid, member]));
    const directMatches = ledgerEntries.filter(
      (entry) => entry.type === "dues" && entry.duesPeriodId === period.id,
    );
    const periodEntries =
      directMatches.length > 0
        ? directMatches
        : ledgerEntries.filter(
            (entry) =>
              entry.type === "dues" &&
              entry.label === period.name &&
              entry.amount === period.amount,
          );
    const grouped = new Map<string, MemberDuesRow>();

    periodEntries.forEach((entry) => {
      const member = memberById.get(entry.uid);
      const existing = grouped.get(entry.uid);
      const nextAmount = (existing?.amount ?? 0) + entry.amount;
      const nextPaid = (existing?.amountPaid ?? 0) + getChargeAmountPaid(entry);
      const outstanding =
        (existing?.outstanding ?? 0) + getChargeOutstanding(entry);
      grouped.set(entry.uid, {
        amount: nextAmount,
        amountPaid: nextPaid,
        dueDate: existing?.dueDate ?? entry.dueDate,
        fullName: member?.fullName ?? entry.uid,
        outstanding,
        paidStatus: resolveStatus(nextAmount, nextPaid),
        photoURL: member?.photoURL,
        uid: entry.uid,
      });
    });

    const statusRank: Record<LedgerPaidStatus, number> = {
      unpaid: 0,
      partial: 1,
      paid: 2,
    };
    return Array.from(grouped.values()).sort(
      (left, right) =>
        statusRank[left.paidStatus] - statusRank[right.paidStatus] ||
        left.fullName.localeCompare(right.fullName),
    );
  }, [ledgerEntries, members, period]);

  if (user && !admin) {
    return <LoadingSpinner />;
  }

  if (financeLoading || membersLoading) {
    return <LoadingSpinner />;
  }

  if (financeError || membersError || !period) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Dues Members"
          showBack
          onBack={() => safeGoBack(navigation, "FinanceAdmin")}
        />
        <EmptyState
          icon="!"
          title="Dues details unavailable"
          message={financeError ?? membersError ?? "This dues period could not be found."}
          actionLabel="Back to Finance"
          onAction={() => safeGoBack(navigation, "FinanceAdmin")}
        />
      </SafeAreaView>
    );
  }

  const paidCount = rows.filter((row) => row.paidStatus === "paid").length;
  const partialCount = rows.filter((row) => row.paidStatus === "partial").length;
  const unpaidCount = rows.filter((row) => row.paidStatus === "unpaid").length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Dues Members"
        showBack
        onBack={() => safeGoBack(navigation, "FinanceAdmin")}
      />
      <FlatList
        data={rows}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.summaryCard}>
            <Text style={styles.periodName}>{period.name}</Text>
            <Text style={styles.periodMeta}>
              {formatCurrency(period.amount)} per member
            </Text>
            <View style={styles.countRow}>
              <SummaryPill label="Paid" value={paidCount} color={colors.status.success} />
              <SummaryPill label="Partial" value={partialCount} color={colors.gold.default} />
              <SummaryPill label="Unpaid" value={unpaidCount} color={colors.status.error} />
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="!"
            title="No member charges found"
            message="No ledger rows are linked to this dues period yet."
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => navigation.navigate("MyLedger", { memberId: item.uid })}
            style={[styles.memberRow, { borderLeftColor: statusColor(item.paidStatus) }]}
          >
            <Avatar
              initials={getInitials(item.fullName)}
              photoURL={item.photoURL}
              size={42}
            />
            <View style={styles.memberCopy}>
              <Text style={styles.memberName}>{item.fullName}</Text>
              <Text style={styles.memberMeta}>
                Paid {formatCurrency(item.amountPaid)} of {formatCurrency(item.amount)}
              </Text>
              {item.outstanding > 0 && (
                <Text style={styles.outstanding}>
                  Outstanding {formatCurrency(item.outstanding)}
                </Text>
              )}
            </View>
            <Badge
              label={statusLabel(item.paidStatus)}
              color={statusColor(item.paidStatus)}
            />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
};

const SummaryPill = ({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) => (
  <View style={[styles.summaryPill, { borderColor: `${color}55` }]}>
    <Text style={[styles.summaryValue, { color }]}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  content: { padding: spacing.lg, gap: spacing.md },
  summaryCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  periodName: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
  },
  periodMeta: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  countRow: { flexDirection: "row", gap: spacing.sm },
  summaryPill: {
    flex: 1,
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.bg.elevated,
  },
  summaryValue: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.black,
  },
  summaryLabel: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
  },
  memberRow: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderRadius: 8,
    backgroundColor: colors.bg.card,
  },
  memberCopy: { flex: 1, gap: spacing.xs },
  memberName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  memberMeta: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  outstanding: {
    fontSize: typography.size.xs,
    color: colors.status.error,
  },
});

export default DuesPeriodMembersScreen;
