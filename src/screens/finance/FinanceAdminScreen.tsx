import React, { useEffect } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Avatar from "../../components/common/Avatar";
import Badge from "../../components/common/Badge";
import EmptyState from "../../components/common/EmptyState";
import GoldButton from "../../components/common/GoldButton";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import OutlineButton from "../../components/common/OutlineButton";
import DuesPeriodCard from "../../components/finance/DuesPeriodCard";
import ScreenHeader from "../../components/common/ScreenHeader";
import SyncStatusBanner from "../../components/common/SyncStatusBanner";
import { useFinance } from "../../hooks/useFinance";
import { useMembers } from "../../hooks/useMembers";
import { useAuthStore } from "../../store/authStore";
import { colors, spacing, typography } from "../../theme";
import {
  getFinanceStanding,
  getFinanceStandingBadgeLabel,
  getFinanceStandingColor,
} from "../../utils/financeStanding";
import { formatCurrency } from "../../utils/formatCurrency";
import { getFinanceTotals } from "../../utils/financeTotals";
import { getInitials } from "../../utils/getInitials";
import { isAdmin } from "../../utils/roleGuard";

const SummaryTile = ({ label, value }: any) => (
  <View style={styles.summaryTile}>
    <Text style={styles.summaryValue}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const FinanceAdminScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const admin = isAdmin(user);
  const {
    duesPeriods,
    error: financeError,
    lastSyncedAt,
    ledgerEntries,
    loading: financeLoading,
    syncState,
  } = useFinance(undefined, admin);
  const {
    error: membersError,
    loading: membersLoading,
    members,
  } = useMembers({
    enabled: admin,
  });

  useEffect(() => {
    if (user && !admin) {
      navigation.replace("MyLedger");
    }
  }, [admin, navigation, user]);

  if (user && !admin) {
    return <LoadingSpinner />;
  }

  if (financeLoading || membersLoading) {
    return <LoadingSpinner />;
  }

  if (financeError || membersError) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Finance" />
        <EmptyState
          icon="!"
          title="Finance unavailable"
          message={financeError ?? membersError ?? "Please try again."}
        />
      </SafeAreaView>
    );
  }

  const {
    outstanding,
    totalCharged,
    totalPaid: totalCollected,
  } = getFinanceTotals(ledgerEntries);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Finance" />
      <FlatList
        data={members}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <SyncStatusBanner state={syncState} lastSyncedAt={lastSyncedAt} />
            <View style={styles.summaryRow}>
              <SummaryTile
                label="Charged"
                value={formatCurrency(totalCharged)}
              />
              <SummaryTile
                label="Collected"
                value={formatCurrency(totalCollected)}
              />
              <SummaryTile
                label="Outstanding"
                value={formatCurrency(outstanding)}
              />
            </View>
            <View style={styles.actionGrid}>
              <GoldButton
                label="Record Payment"
                onPress={() => navigation.navigate("RecordPayment")}
              />
              <OutlineButton
                label="New Dues"
                onPress={() => navigation.navigate("DuesPeriodForm")}
              />
              <OutlineButton
                label="Ad Hoc Charge"
                onPress={() => navigation.navigate("AdHocCharge")}
              />
            </View>
            <Text style={[styles.sectionLabel, { marginBottom: spacing.sm }]}>
              DUES PERIODS
            </Text>
            {duesPeriods.map((period) => (
              <DuesPeriodCard
                key={period.id}
                period={period}
                onPress={() =>
                  navigation.navigate("DuesPeriodMembers", {
                    duesPeriodId: period.id,
                  })
                }
              />
            ))}
            <Text style={styles.sectionLabel}>MEMBER LEDGER</Text>
          </>
        }
        renderItem={({ item }) => {
          const standing = getFinanceStanding(
            item.financialStatus,
            item.outstandingBalance,
          );
          const balance = formatCurrency(item.outstandingBalance);
          return (
            <TouchableOpacity
              style={styles.memberRow}
              onPress={() =>
                navigation.navigate("MyLedger", { memberId: item.uid })
              }
              activeOpacity={0.8}
            >
              <Avatar
                initials={getInitials(item.fullName)}
                photoURL={item.photoURL}
                statusDot={item.financialStatus}
              />
              <View style={styles.memberContent}>
                <Text style={styles.memberName}>{item.fullName}</Text>
                <Text style={styles.memberMeta}>
                  {standing === "clear"
                    ? "Good standing"
                    : standing === "overdue"
                      ? `Overdue ${balance}`
                      : `Balance due ${balance}`}
                </Text>
              </View>
              <Badge
                label={getFinanceStandingBadgeLabel(standing)}
                color={getFinanceStandingColor(standing)}
              />
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
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
  actionGrid: { gap: spacing.sm },
  sectionLabel: {
    marginTop: spacing.lg,
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.8,
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

export default FinanceAdminScreen;
