import React, { useEffect, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import Avatar from "../../components/common/Avatar";
import Badge from "../../components/common/Badge";
import EmptyState from "../../components/common/EmptyState";
import FeedbackModal, { FeedbackModalType } from "../../components/common/FeedbackModal";
import Icon from "../../components/common/FeatherIcon";
import GoldButton from "../../components/common/GoldButton";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import OutlineButton from "../../components/common/OutlineButton";
import DuesPeriodCard from "../../components/finance/DuesPeriodCard";
import FinanceDomainTabs from "../../components/finance/FinanceDomainTabs";
import LedgerRow from "../../components/finance/LedgerRow";
import ScreenHeader from "../../components/common/ScreenHeader";
import SyncStatusBanner from "../../components/common/SyncStatusBanner";
import ContributionsAdminPanel from "./ContributionsAdminPanel";
import { useFinance } from "../../hooks/useFinance";
import { deleteDuesPeriod } from "../../services/financeService";
import { FinanceDomain } from "../../types/contributions";
import { DuesPeriod, LedgerType } from "../../types/finance";
import { useMembers } from "../../hooks/useMembers";
import { useAuthStore } from "../../store/authStore";
import {spacing, typography, useThemeColors, useThemedStyles, AppColors} from '../../theme';
import {
  getFinanceStanding,
  getFinanceStandingBadgeLabel,
  getFinanceStandingColor,
} from "../../utils/financeStanding";
import { formatCurrency } from "../../utils/formatCurrency";
import {
  getChargeAmountPaid,
  getChargeOutstanding,
  getFinanceTotals,
} from "../../utils/financeTotals";
import { getInitials } from "../../utils/getInitials";
import { isAdmin } from "../../utils/roleGuard";

type ArchivedBalance = {
  chargeCount: number;
  labels: string[];
  outstanding: number;
  uid: string;
};

const shortUid = (uid: string) =>
  uid.length > 8 ? `${uid.slice(0, 4)}...${uid.slice(-4)}` : uid;

const chargeButtons: { label: string; value: LedgerType }[] = [
  { label: "Dues", value: "dues" },
  { label: "Levies", value: "levy" },
  { label: "Donations", value: "donation" },
  { label: "Fines", value: "fine" },
  { label: "Pledges", value: "pledge" },
  { label: "Other Charges", value: "other" },
];

const FinanceAdminScreen = ({ navigation }: any) => {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);

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
  const [deletingPeriodId, setDeletingPeriodId] = useState<string | null>(null);
  const [domain, setDomain] = useState<FinanceDomain>("dues");
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
  const [breakdownMetric, setBreakdownMetric] = useState<
    "charged" | "collected" | "outstanding" | null
  >(null);
  const [breakdownType, setBreakdownType] = useState<LedgerType | null>(null);
  const openBreakdown = (metric: "charged" | "collected" | "outstanding") => {
    setBreakdownType(null);
    setBreakdownMetric(metric);
  };
  const closeBreakdown = () => {
    setBreakdownType(null);
    setBreakdownMetric(null);
  };


  const handleDeletePeriod = (period: DuesPeriod) => {
    if (deletingPeriodId) {
      return;
    }
    setModal({
      visible: true,
      type: "warning",
      title: "Delete Dues Period",
      message: `Delete "${period.name}" and its unpaid charges for all members? This cannot be undone.`,
      primaryLabel: "Delete",
      onPrimary: async () => {
        closeModal();
        try {
          setDeletingPeriodId(period.id);
          await deleteDuesPeriod(period.id);
        } catch (error) {
          setModal({ visible: true, type: "error", title: "Dues period not deleted", message: error instanceof Error ? error.message : "Please try again.", onPrimary: closeModal });
        } finally {
          setDeletingPeriodId(null);
        }
      },
      secondaryLabel: "Cancel",
      onSecondary: closeModal,
    });
  };

  const myLedgerButton = (
    <OutlineButton
      label="My Ledger"
      size="sm"
      onPress={() => navigation.navigate("MyLedger")}
    />
  );

  useEffect(() => {
    if (user && !admin) {
      navigation.replace("MyLedger");
    }
  }, [admin, navigation, user]);

  if (user && !admin) {
    return <LoadingSpinner />;
  }

  if (domain === "dues" && (financeLoading || membersLoading)) {
    return <LoadingSpinner />;
  }

  if (domain === "dues" && (financeError || membersError)) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Finance" rightElement={myLedgerButton} />
        <View style={styles.tabsWrap}>
          <FinanceDomainTabs value={domain} onChange={setDomain} />
        </View>
        <EmptyState
          icon="!"
          title="Finance unavailable"
          message={financeError ?? membersError ?? "Please try again."}
        />
      </SafeAreaView>
    );
  }

  if (domain === "contributions") {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Finance" rightElement={myLedgerButton} />
        <View style={styles.tabsWrap}>
          <FinanceDomainTabs value={domain} onChange={setDomain} />
        </View>
        <ContributionsAdminPanel navigation={navigation} />
      </SafeAreaView>
    );
  }


  const {
    outstanding,
    totalCharged,
    totalPaid: totalCollected,
  } = getFinanceTotals(ledgerEntries);
  const typeBreakdown = chargeButtons.map(({ label, value }) => {
    const typeCharges = ledgerEntries.filter((entry) => entry.type === value);
    return {
      type: value,
      label,
      charged: typeCharges.reduce((sum, entry) => sum + entry.amount, 0),
      collected: typeCharges.reduce(
        (sum, entry) => sum + getChargeAmountPaid(entry),
        0,
      ),
      outstanding: typeCharges.reduce(
        (sum, entry) => sum + getChargeOutstanding(entry),
        0,
      ),
    };
  });
  const recentTransactions = [...ledgerEntries]
    .sort(
      (left, right) =>
        ((right.paidAt ?? right.dueDate)?.getTime() ?? 0) -
        ((left.paidAt ?? left.dueDate)?.getTime() ?? 0),
    )
    .slice(0, 4);
  const breakdownTotal =
    breakdownMetric === "charged"
      ? totalCharged
      : breakdownMetric === "collected"
        ? totalCollected
        : outstanding;
  const metricTitle =
    breakdownMetric === "charged"
      ? "Charged"
      : breakdownMetric === "collected"
        ? "Collected"
        : "Outstanding";
  const selectedTypeRow = typeBreakdown.find(
    (row) => row.type === breakdownType,
  );
  const memberNameByUid = new Map(
    members.map((member) => [member.uid, member.fullName]),
  );
  const resolveMemberName = (uid: string) =>
    memberNameByUid.get(uid) ?? `Archived · ${shortUid(uid)}`;
  const personBreakdown =
    breakdownMetric && breakdownType
      ? Array.from(
          ledgerEntries
            .filter((entry) => entry.type === breakdownType)
            .reduce((totals, entry) => {
              const amount =
                breakdownMetric === "charged"
                  ? entry.amount
                  : breakdownMetric === "collected"
                    ? getChargeAmountPaid(entry)
                    : getChargeOutstanding(entry);
              totals.set(entry.uid, (totals.get(entry.uid) ?? 0) + amount);
              return totals;
            }, new Map<string, number>())
            .entries(),
        )
          .filter(([, amount]) => amount > 0)
          .map(([uid, amount]) => ({ uid, amount }))
          .sort((left, right) => right.amount - left.amount)
      : [];
  const breakdownDisplayTotal =
    breakdownType && breakdownMetric && selectedTypeRow
      ? selectedTypeRow[breakdownMetric]
      : breakdownTotal;
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
      onDelete={handleDeletePeriod}
      onPress={() =>
        navigation.navigate("DuesPeriodMembers", {
          duesPeriodId: period.id,
        })
      }
    />
  ));

  return (
    <SafeAreaView style={styles.safe}>
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
              {breakdownType && (
                <TouchableOpacity
                  style={styles.breakdownBack}
                  onPress={() => setBreakdownType(null)}
                  activeOpacity={0.8}
                >
                  <Icon
                    name="arrow-left"
                    size={20}
                    color={colors.gold.default}
                  />
                </TouchableOpacity>
              )}
              <Text style={styles.breakdownTitle} numberOfLines={1}>
                {metricTitle}
                {breakdownType
                  ? ` · ${selectedTypeRow?.label ?? ""}`
                  : " by charge type"}
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
              {breakdownType ? (
                personBreakdown.length > 0 ? (
                  personBreakdown.map((row) => (
                    <View key={row.uid} style={styles.breakdownRow}>
                      <Text
                        style={styles.breakdownRowLabel}
                        numberOfLines={1}
                      >
                        {resolveMemberName(row.uid)}
                      </Text>
                      <Text style={styles.breakdownRowValue}>
                        {formatCurrency(row.amount)}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.recentEmpty}>
                    No members for this charge type.
                  </Text>
                )
              ) : (
                typeBreakdown.map((row) => (
                  <TouchableOpacity
                    key={row.type}
                    style={styles.breakdownRow}
                    activeOpacity={0.8}
                    onPress={() => setBreakdownType(row.type)}
                  >
                    <Text style={styles.breakdownRowLabel}>{row.label}</Text>
                    <View style={styles.breakdownRowRight}>
                      <Text style={styles.breakdownRowValue}>
                        {formatCurrency(
                          breakdownMetric ? row[breakdownMetric] : 0,
                        )}
                      </Text>
                      <Icon
                        name="chevron-right"
                        size={16}
                        color={colors.text.tertiary}
                      />
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <View style={styles.breakdownTotalRow}>
              <Text style={styles.breakdownTotalLabel}>Total</Text>
              <Text style={styles.breakdownTotalValue}>
                {formatCurrency(breakdownDisplayTotal)}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
      <ScreenHeader title="Finance" rightElement={myLedgerButton} />
      <View style={styles.tabsWrap}>
        <FinanceDomainTabs value={domain} onChange={setDomain} />
      </View>
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
                onPress={() => openBreakdown("outstanding")}
              >
                <Text style={styles.heroLabel}>Outstanding balance</Text>
                <Text style={styles.heroValue}>
                  {formatCurrency(outstanding)}
                </Text>
              </TouchableOpacity>
              <View style={styles.heroDivider} />
              <View style={styles.heroSplitRow}>
                <TouchableOpacity
                  style={styles.heroStat}
                  activeOpacity={0.85}
                  onPress={() => openBreakdown("charged")}
                >
                  <Text style={styles.heroStatLabel}>Charged</Text>
                  <Text style={styles.heroStatValue}>
                    {formatCurrency(totalCharged)}
                  </Text>
                </TouchableOpacity>
                <View style={styles.heroStatDivider} />
                <TouchableOpacity
                  style={styles.heroStat}
                  activeOpacity={0.85}
                  onPress={() => openBreakdown("collected")}
                >
                  <Text style={styles.heroStatLabel}>Collected</Text>
                  <Text style={styles.heroStatValue}>
                    {formatCurrency(totalCollected)}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.heroHint}>
                Tap any figure for a breakdown by charge type
              </Text>
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
            </View>
            <Text style={styles.sectionLabel}>NEW CHARGE</Text>
            <View style={styles.chargeGrid}>
              {chargeButtons.map((charge) => (
                <TouchableOpacity
                  key={charge.value}
                  style={styles.chargeButton}
                  onPress={() =>
                    navigation.navigate("AdHocCharge", {
                      chargeType: charge.value,
                    })
                  }
                  activeOpacity={0.8}
                >
                  <Text style={styles.chargeButtonText}>{charge.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.recentHeader}>
              <Text style={[styles.sectionLabel, { marginTop: 0 }]}>
                RECENT TRANSACTIONS
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate("ChargeLedger")}
              >
                <Text style={styles.viewAllLink}>View all</Text>
              </TouchableOpacity>
            </View>
            {recentTransactions.length > 0 ? (
              <View style={styles.recentList}>
                {recentTransactions.map((entry) => (
                  <LedgerRow key={entry.id} entry={entry} />
                ))}
              </View>
            ) : (
              <Text style={styles.recentEmpty}>No transactions yet.</Text>
            )}
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
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  tabsWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
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
  recentHeader: {
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  viewAllLink: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.gold.light,
  },
  recentList: { marginTop: spacing.sm, gap: spacing.sm },
  recentEmpty: {
    marginTop: spacing.sm,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
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
  breakdownBack: {
    width: 36,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  breakdownScroll: { maxHeight: 400 },
  breakdownScrollContent: { gap: spacing.xs },
  breakdownRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
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
  actionGrid: { marginTop: spacing.lg, gap: spacing.sm },
  chargeGrid: {
    marginTop: spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chargeButton: {
    width: "31%",
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gold.default,
    backgroundColor: colors.bg.card,
  },
  chargeButtonText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.gold.light,
    textAlign: "center",
  },
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
