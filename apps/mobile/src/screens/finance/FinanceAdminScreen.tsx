import React, { useEffect, useState } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import { getChargeOutstanding, getFinanceTotals } from "../../utils/financeTotals";
import { getInitials } from "../../utils/getInitials";
import { isAdmin } from "../../utils/roleGuard";

type ArchivedBalance = {
  chargeCount: number;
  labels: string[];
  outstanding: number;
  uid: string;
};

const SummaryTile = ({ label, value }: any) => (
  <View style={styles.summaryTile}>
    <Text style={styles.summaryValue}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const shortUid = (uid: string) =>
  uid.length > 8 ? `${uid.slice(0, 4)}...${uid.slice(-4)}` : uid;

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
  const [memberSearch, setMemberSearch] = useState("");

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
  const activeMemberIds = new Set(members.map((member) => member.uid));
  const archivedBalances = ledgerEntries
    .filter(
      (entry) =>
        entry.type !== "payment" &&
        !activeMemberIds.has(entry.uid) &&
        getChargeOutstanding(entry) > 0,
    )
    .reduce<ArchivedBalance[]>((balances, entry) => {
      const existing = balances.find((balance) => balance.uid === entry.uid);
      const amount = getChargeOutstanding(entry);
      if (existing) {
        existing.outstanding += amount;
        existing.chargeCount += 1;
        if (!existing.labels.includes(entry.label)) {
          existing.labels.push(entry.label);
        }
        return balances;
      }
      balances.push({
        chargeCount: 1,
        labels: [entry.label],
        outstanding: amount,
        uid: entry.uid,
      });
      return balances;
    }, []);
  const archivedOutstanding = archivedBalances.reduce(
    (sum, balance) => sum + balance.outstanding,
    0,
  );
  const searchQuery = memberSearch.trim().toLowerCase();
  const filteredMembers = searchQuery
    ? members.filter((member) =>
        `${member.fullName} ${member.email} ${member.phone}`
          .toLowerCase()
          .includes(searchQuery),
      )
    : members;
  const duesPeriodCards = duesPeriods.map((period) => (
    <DuesPeriodCard
      key={period.id}
      period={period}
      onPress={() =>
        navigation.navigate("DuesPeriodMembers", {
          duesPeriodId: period.id,
        })
      }
    />
  ));

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Finance" />
      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
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
            <Text style={styles.sectionLabel}>ALL CHARGES LEDGER</Text>
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => navigation.navigate("ChargeLedger")}
              style={styles.chargeLedgerButton}
            >
              <View style={styles.chargeLedgerCopy}>
                <Text style={styles.chargeLedgerTitle}>All Charges Ledger</Text>
                <Text style={styles.chargeLedgerMeta}>
                  Monthly totals, all-time totals, payments, and outstanding charges.
                </Text>
              </View>
              <View style={styles.chargeLedgerBadge}>
                <Badge label="OPEN" color={colors.gold.default} />
              </View>
            </TouchableOpacity>
            <Text style={[styles.sectionLabel, { marginBottom: spacing.sm }]}>
              DUES PERIODS
            </Text>
            {duesPeriods.length > 2 ? (
              <ScrollView
                style={styles.duesScroll}
                contentContainerStyle={styles.duesList}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                {duesPeriodCards}
              </ScrollView>
            ) : (
              <View style={styles.duesList}>{duesPeriodCards}</View>
            )}
            <Text style={styles.sectionLabel}>MEMBER LEDGER</Text>
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
        ListFooterComponent={
          archivedBalances.length > 0 ? (
            <View style={styles.archivedSection}>
              <View style={styles.archivedHeader}>
                <View style={styles.archivedTitleGroup}>
                  <Text style={styles.sectionLabel}>ARCHIVED MEMBER BALANCES</Text>
                  <Text style={styles.archivedHelp}>
                    Preserved for accounting after account deletion.
                  </Text>
                </View>
                <Badge
                  label={formatCurrency(archivedOutstanding)}
                  color={colors.gold.default}
                />
              </View>
              {archivedBalances.map((balance) => (
                <View key={balance.uid} style={styles.archivedRow}>
                  <View style={styles.archivedIcon}>
                    <Text style={styles.archivedIconText}>AM</Text>
                  </View>
                  <View style={styles.memberContent}>
                    <Text style={styles.memberName}>Archived member</Text>
                    <Text style={styles.memberMeta}>
                      {balance.chargeCount} retained charge
                      {balance.chargeCount === 1 ? "" : "s"} · ID{" "}
                      {shortUid(balance.uid)}
                    </Text>
                    <Text style={styles.archivedLabels}>
                      {balance.labels.join(", ")}
                    </Text>
                  </View>
                  <Badge
                    label={`OWING ${formatCurrency(balance.outstanding)}`}
                    color={colors.gold.default}
                  />
                </View>
              ))}
            </View>
          ) : null
        }
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
  duesList: { gap: spacing.md },
  duesScroll: { maxHeight: 320 },
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
  chargeLedgerButton: {
    minHeight: 96,
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
  chargeLedgerCopy: {
    flex: 1,
    minWidth: 0,
  },
  chargeLedgerBadge: {
    flexShrink: 0,
  },
  chargeLedgerTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
  },
  chargeLedgerMeta: {
    marginTop: spacing.xs,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  archivedSection: { gap: spacing.md },
  archivedHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  archivedTitleGroup: { flex: 1, gap: spacing.xs },
  archivedHelp: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  archivedRow: {
    minHeight: 84,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  archivedIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg.elevated,
  },
  archivedIconText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.black,
    color: colors.gold.default,
  },
  archivedLabels: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
  },
});

export default FinanceAdminScreen;
