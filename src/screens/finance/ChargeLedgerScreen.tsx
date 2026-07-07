import {
  addMonths,
  endOfMonth,
  format,
  isWithinInterval,
  startOfMonth,
} from "date-fns";
import React, { useMemo, useState } from "react";
import {
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Avatar from "../../components/common/Avatar";
import Badge from "../../components/common/Badge";
import EmptyState from "../../components/common/EmptyState";
import Icon from "../../components/common/FeatherIcon";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ScreenHeader from "../../components/common/ScreenHeader";
import { useFinance } from "../../hooks/useFinance";
import { useMembers } from "../../hooks/useMembers";
import { useAuthStore } from "../../store/authStore";
import { colors, spacing, typography } from "../../theme";
import { LedgerEntry, LedgerType } from "../../types/finance";
import { User } from "../../types/user";
import { formatDisplayDate } from "../../utils/formatDate";
import { formatCurrency } from "../../utils/formatCurrency";
import {
  chargeStatusColor,
  chargeStatusLabel,
  getChargeDisplayStatus,
} from "../../utils/financeChargeStatus";
import {
  getChargeAmountPaid,
  getChargeOutstanding,
  getFinanceTotals,
} from "../../utils/financeTotals";
import { getInitials } from "../../utils/getInitials";
import { safeGoBack } from "../../utils/navigation";
import { isAdmin } from "../../utils/roleGuard";

type LedgerSectionRow =
  | { entry: LedgerEntry; kind: "charge"; member?: User }
  | { entry: LedgerEntry; kind: "payment"; member?: User };

type LedgerSection = {
  data: LedgerSectionRow[];
  title: string;
};

type LedgerMonth = {
  date: Date;
  key: string;
};

const typeLabel: Record<LedgerType, string> = {
  dues: "Dues",
  fine: "Fine",
  levy: "Levy",
  payment: "Payment",
  pledge: "Pledge",
};

const typeIcon: Record<LedgerType, string> = {
  dues: "file-text",
  fine: "alert-triangle",
  levy: "credit-card",
  payment: "arrow-up",
  pledge: "heart",
};

const memberName = (member: User | undefined, uid: string) =>
  member?.fullName ?? `Archived member ${uid.slice(0, 4)}...${uid.slice(-4)}`;

const LEDGER_START_MONTH = startOfMonth(new Date(2026, 5, 1));

const monthKey = (date: Date) => format(startOfMonth(date), "yyyy-MM");

const monthLabel = (date: Date) => format(date, "MMMM yyyy");

const entryMonthDate = (entry: LedgerEntry) =>
  entry.type === "payment" ? entry.paidAt : entry.dueDate;

const monthsBetween = (start: Date, end: Date) => {
  const months: LedgerMonth[] = [];
  let cursor = startOfMonth(start);
  const finalMonth = startOfMonth(end);

  while (cursor.getTime() <= finalMonth.getTime()) {
    months.push({ date: cursor, key: monthKey(cursor) });
    cursor = addMonths(cursor, 1);
  }

  return months;
};

const ChargeLedgerScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const admin = isAdmin(user);
  const {
    error: financeError,
    ledgerEntries,
    loading: financeLoading,
  } = useFinance(undefined, admin);
  const {
    error: membersError,
    loading: membersLoading,
    members,
  } = useMembers({ enabled: admin });

  const memberById = useMemo(
    () => new Map(members.map((member) => [member.uid, member])),
    [members],
  );

  const chargeEntries = useMemo(
    () =>
      ledgerEntries
        .filter((entry) => entry.type !== "payment")
        .sort((left, right) => {
          const leftStatus = getChargeDisplayStatus(left);
          const rightStatus = getChargeDisplayStatus(right);
          const statusRank = { overdue: 0, unpaid: 1, partial: 2, paid: 3 };
          return (
            statusRank[leftStatus] - statusRank[rightStatus] ||
            (left.dueDate?.getTime() ?? 0) - (right.dueDate?.getTime() ?? 0)
          );
        }),
    [ledgerEntries],
  );

  const paymentEntries = useMemo(
    () =>
      ledgerEntries
        .filter((entry) => entry.type === "payment")
        .sort(
          (left, right) =>
            (right.paidAt?.getTime() ?? 0) - (left.paidAt?.getTime() ?? 0),
        ),
    [ledgerEntries],
  );

  const monthOptions = useMemo<LedgerMonth[]>(() => {
    const entryDates = ledgerEntries
      .map(entryMonthDate)
      .filter((date): date is Date => Boolean(date));
    const currentMonth = startOfMonth(new Date());
    const latestMonth = entryDates.reduce(
      (latest, date) => (date.getTime() > latest.getTime() ? date : latest),
      currentMonth,
    );

    return monthsBetween(LEDGER_START_MONTH, latestMonth);
  }, [ledgerEntries]);

  const [selectedMonthKey, setSelectedMonthKey] = useState(() =>
    monthKey(new Date()),
  );

  const selectedMonth =
    monthOptions.find((month) => month.key === selectedMonthKey) ??
    monthOptions[0] ?? {
      date: startOfMonth(new Date()),
      key: monthKey(new Date()),
    };
  const [selectedYear, setSelectedYear] = useState(() =>
    selectedMonth.date.getFullYear(),
  );
  const yearOptions = useMemo(
    () =>
      Array.from(new Set(monthOptions.map((month) => month.date.getFullYear()))).sort(
        (left, right) => right - left,
      ),
    [monthOptions],
  );
  const monthsForSelectedYear = monthOptions
    .filter((month) => month.date.getFullYear() === selectedYear)
    .sort((left, right) => left.date.getMonth() - right.date.getMonth());

  const selectYear = (year: number) => {
    setSelectedYear(year);
    const latestMonthForYear = monthOptions
      .filter((month) => month.date.getFullYear() === year)
      .sort((left, right) => right.date.getTime() - left.date.getTime())[0];
    if (latestMonthForYear) {
      setSelectedMonthKey(latestMonthForYear.key);
    }
  };

  const selectMonth = (month: LedgerMonth) => {
    setSelectedYear(month.date.getFullYear());
    setSelectedMonthKey(month.key);
  };

  const selectedMonthRange = {
    end: endOfMonth(selectedMonth.date),
    start: startOfMonth(selectedMonth.date),
  };
  const monthCharges = chargeEntries.filter(
    (entry) =>
      entry.dueDate && isWithinInterval(entry.dueDate, selectedMonthRange),
  );
  const monthPayments = paymentEntries.filter(
    (entry) =>
      entry.paidAt && isWithinInterval(entry.paidAt, selectedMonthRange),
  );
  const monthTotals = {
    outstanding: monthCharges.reduce(
      (sum, entry) => sum + getChargeOutstanding(entry),
      0,
    ),
    totalCharged: monthCharges.reduce((sum, entry) => sum + entry.amount, 0),
    totalPaid: monthPayments.reduce((sum, entry) => sum + entry.amount, 0),
  };
  const allTimeTotals = getFinanceTotals(ledgerEntries);

  const sections: LedgerSection[] = [
    {
      data: monthCharges.map((entry) => ({
        entry,
        kind: "charge" as const,
        member: memberById.get(entry.uid),
      })),
      title: "OPEN CHARGES & CHARGE HISTORY",
    },
    {
      data: monthPayments.map((entry) => ({
        entry,
        kind: "payment" as const,
        member: memberById.get(entry.uid),
      })),
      title: "PAYMENTS RECEIVED",
    },
  ].filter((section) => section.data.length > 0);

  if (!admin) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Charge Ledger"
          showBack
          onBack={() => safeGoBack(navigation, "FinanceAdmin")}
        />
        <EmptyState
          icon="!"
          title="Admin only"
          message="Only admins can review the full charge ledger."
        />
      </SafeAreaView>
    );
  }

  if (financeLoading || membersLoading) {
    return <LoadingSpinner />;
  }

  if (financeError || membersError) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Charge Ledger"
          showBack
          onBack={() => safeGoBack(navigation, "FinanceAdmin")}
        />
        <EmptyState
          icon="!"
          title="Ledger unavailable"
          message={financeError ?? membersError ?? "Please try again."}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Charge Ledger"
        showBack
        onBack={() => safeGoBack(navigation, "FinanceAdmin")}
      />
      <SectionList<LedgerSectionRow, LedgerSection>
        sections={sections}
        keyExtractor={(item) => `${item.kind}-${item.entry.id}`}
        contentContainerStyle={styles.content}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={styles.headerStack}>
            <View style={styles.monthSelectorCard}>
              <Text style={styles.selectorLabel}>LEDGER PERIOD</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.yearChips}
              >
                {yearOptions.map((year) => {
                  const selected = year === selectedYear;
                  return (
                    <TouchableOpacity
                      key={year}
                      activeOpacity={0.84}
                      onPress={() => selectYear(year)}
                      style={[styles.yearChip, selected && styles.yearChipActive]}
                    >
                      <Text
                        style={[
                          styles.yearChipText,
                          selected && styles.yearChipTextActive,
                        ]}
                      >
                        {year}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <View style={styles.monthGrid}>
                {monthsForSelectedYear.map((month) => {
                  const selected = month.key === selectedMonth.key;
                  return (
                    <TouchableOpacity
                      key={month.key}
                      activeOpacity={0.84}
                      onPress={() => selectMonth(month)}
                      style={[styles.monthChip, selected && styles.monthChipActive]}
                    >
                      <Text
                        style={[
                          styles.monthChipText,
                          selected && styles.monthChipTextActive,
                        ]}
                      >
                        {format(month.date, "MMM")}
                      </Text>
                      <Text
                        style={[
                          styles.monthChipMeta,
                          selected && styles.monthChipMetaActive,
                        ]}
                      >
                        {format(month.date, "yyyy")}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View style={styles.summaryCard}>
              <View>
                <Text style={styles.summaryTitle}>
                  {monthLabel(selectedMonth.date)} ledger
                </Text>
                <Text style={styles.summaryMeta}>
                  Charges due and payments received in this month.
                </Text>
              </View>
              <View style={styles.summaryGrid}>
                <SummaryTile label="Charged" value={monthTotals.totalCharged} />
                <SummaryTile label="Collected" value={monthTotals.totalPaid} />
                <SummaryTile label="Outstanding" value={monthTotals.outstanding} />
              </View>
            </View>
            <View style={styles.summaryCard}>
              <View>
                <Text style={styles.summaryTitle}>All charges</Text>
                <Text style={styles.summaryMeta}>
                  Total charged, collected, and outstanding across every charge type.
                </Text>
              </View>
              <View style={styles.summaryGrid}>
                <SummaryTile label="Charged" value={allTimeTotals.totalCharged} />
                <SummaryTile label="Collected" value={allTimeTotals.totalPaid} />
                <SummaryTile label="Outstanding" value={allTimeTotals.outstanding} />
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="!"
            title={`No ${monthLabel(selectedMonth.date)} entries`}
            message="Charges due and payments received for the selected month will appear here."
          />
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionLabel}>{section.title}</Text>
        )}
        renderItem={({ item }) =>
          item.kind === "charge" ? (
            <ChargeRow item={item} navigation={navigation} />
          ) : (
            <PaymentRow item={item} navigation={navigation} />
          )
        }
      />
    </SafeAreaView>
  );
};

const SummaryTile = ({ label, value }: { label: string; value: number }) => (
  <View style={styles.summaryTile}>
    <Text style={styles.summaryValue}>{formatCurrency(value)}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const ChargeRow = ({
  item,
  navigation,
}: {
  item: Extract<LedgerSectionRow, { kind: "charge" }>;
  navigation: any;
}) => {
  const { entry, member } = item;
  const outstanding = getChargeOutstanding(entry);
  const amountPaid = getChargeAmountPaid(entry);
  const status = getChargeDisplayStatus(entry);
  const statusColor = chargeStatusColor(status);
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={() => navigation.navigate("MyLedger", { memberId: entry.uid })}
      style={[styles.ledgerRow, { borderLeftColor: statusColor }]}
    >
      <Avatar
        initials={getInitials(memberName(member, entry.uid))}
        photoURL={member?.photoURL}
        size={42}
      />
      <View style={styles.rowContent}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowTitle}>{memberName(member, entry.uid)}</Text>
          <Badge label={chargeStatusLabel(status)} color={statusColor} />
        </View>
        <Text style={styles.rowMeta}>
          {typeLabel[entry.type]} · {entry.label}
        </Text>
        <Text style={styles.rowMeta}>
          Due {entry.dueDate ? formatDisplayDate(entry.dueDate) : "date not set"}
        </Text>
        <Text style={styles.rowMoney}>
          Charged {formatCurrency(entry.amount)} · Paid {formatCurrency(amountPaid)}
          {outstanding > 0 ? ` · Owes ${formatCurrency(outstanding)}` : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const PaymentRow = ({
  item,
  navigation,
}: {
  item: Extract<LedgerSectionRow, { kind: "payment" }>;
  navigation: any;
}) => {
  const { entry, member } = item;
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={() => navigation.navigate("MyLedger", { memberId: entry.uid })}
      style={[styles.ledgerRow, { borderLeftColor: colors.status.success }]}
    >
      <View style={[styles.iconBox, { backgroundColor: `${colors.status.success}18` }]}>
        <Icon
          name={typeIcon[entry.type]}
          size={18}
          color={colors.status.success}
        />
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowTitle}>{memberName(member, entry.uid)}</Text>
          <Badge label="PAID" color={colors.status.success} />
        </View>
        <Text style={styles.rowMeta}>
          {entry.paymentMethod || entry.label}
          {entry.reference ? ` · ${entry.reference}` : ""}
        </Text>
        <Text style={styles.rowMeta}>
          Paid {entry.paidAt ? formatDisplayDate(entry.paidAt) : "date not set"}
        </Text>
        <Text style={[styles.rowMoney, { color: colors.status.success }]}>
          Received {formatCurrency(entry.amount)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  headerStack: { gap: spacing.md },
  monthSelectorCard: {
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  selectorLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.black,
    letterSpacing: 2,
    color: colors.text.secondary,
  },
  yearChips: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  yearChip: {
    minWidth: 92,
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: 999,
    backgroundColor: colors.bg.card,
  },
  yearChipActive: {
    borderColor: colors.gold.default,
    backgroundColor: `${colors.gold.default}22`,
  },
  yearChipText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.text.secondary,
  },
  yearChipTextActive: {
    color: colors.gold.default,
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  monthChip: {
    flexBasis: "31%",
    flexGrow: 1,
    gap: spacing.xs,
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: 8,
    backgroundColor: colors.bg.card,
  },
  monthChipActive: {
    borderColor: colors.gold.default,
    backgroundColor: colors.gold.default,
  },
  monthChipText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.text.secondary,
  },
  monthChipTextActive: {
    color: colors.text.onGold,
  },
  monthChipMeta: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
  },
  monthChipMetaActive: {
    color: colors.text.onGold,
  },
  summaryCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  summaryTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
  },
  summaryMeta: {
    marginTop: spacing.xs,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  summaryGrid: { flexDirection: "row", gap: spacing.sm },
  summaryTile: {
    flex: 1,
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.bg.elevated,
  },
  summaryValue: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
  },
  summaryLabel: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
  },
  sectionLabel: {
    marginTop: spacing.lg,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.black,
    letterSpacing: 2,
    color: colors.text.secondary,
  },
  ledgerRow: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderRadius: 8,
    backgroundColor: colors.bg.card,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: { flex: 1, gap: spacing.xs },
  rowTitleLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  rowTitle: {
    flex: 1,
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  rowMeta: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  rowMoney: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.gold.default,
  },
});

export default ChargeLedgerScreen;
