import React, { useMemo, useState } from "react";
import { parse } from "date-fns";
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Avatar from "../../components/common/Avatar";
import CalendarDateField from "../../components/common/CalendarDateField";
import ChipRow from "../../components/common/ChipRow";
import EmptyState from "../../components/common/EmptyState";
import FeedbackModal, {
  FeedbackModalType,
} from "../../components/common/FeedbackModal";
import GoldButton from "../../components/common/GoldButton";
import Icon from "../../components/common/FeatherIcon";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ScreenHeader from "../../components/common/ScreenHeader";
import { useContributions } from "../../hooks/useContributions";
import { useFinance } from "../../hooks/useFinance";
import { useMembers } from "../../hooks/useMembers";
import { useAuthStore } from "../../store/authStore";
import {
  spacing,
  typography,
  useThemeColors,
  useThemedStyles,
  AppColors,
} from "../../theme";
import { LedgerType } from "../../types/finance";
import { ReportFormat, ReportType } from "../../types/reports";
import { exportReport } from "../../utils/reportExport";
import {
  buildContributionsReportData,
  buildDuesReportData,
  buildLedgerReportData,
  buildMemberStatementData,
} from "../../utils/reportBuilders";
import { getInitials } from "../../utils/getInitials";
import { safeGoBack } from "../../utils/navigation";
import { isAdmin } from "../../utils/roleGuard";

const ALL_SENTINEL = "__all__";

const REPORT_TYPE_OPTIONS: { label: string; value: ReportType }[] = [
  { label: "Dues", value: "dues" },
  { label: "Full Ledger", value: "ledger" },
  { label: "Contributions", value: "contributions" },
  { label: "Statement", value: "statement" },
];

const FORMAT_OPTIONS: { label: string; value: ReportFormat }[] = [
  { label: "CSV", value: "csv" },
  { label: "PDF", value: "pdf" },
];

const CHARGE_TYPE_OPTIONS: { label: string; value: LedgerType }[] = [
  { label: "Dues", value: "dues" },
  { label: "Levies", value: "levy" },
  { label: "Donations", value: "donation" },
  { label: "Fines", value: "fine" },
  { label: "Pledges", value: "pledge" },
  { label: "Other", value: "other" },
  { label: "Payments", value: "payment" },
];

const parseDateFilter = (value: string): Date | undefined => {
  if (!value.trim()) {
    return undefined;
  }
  const parsed = parse(value, "yyyy-MM-dd", new Date());
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "report";

const ReportsScreen = ({ navigation, route }: any) => {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);

  const { user } = useAuthStore();
  const admin = isAdmin(user);

  const {
    duesPeriods,
    error: financeError,
    ledgerEntries,
    loading: financeLoading,
  } = useFinance(undefined, admin);
  const {
    entries: contributionEntries,
    error: contributionsError,
    loading: contributionsLoading,
    pools,
    withdrawRequests,
  } = useContributions(undefined, admin);
  const {
    members,
    error: membersError,
    loading: membersLoading,
  } = useMembers({ enabled: admin });

  const [reportType, setReportType] = useState<ReportType>(
    route.params?.presetType ?? "ledger",
  );
  const [fileFormat, setFileFormat] = useState<ReportFormat>("csv");
  const [duesPeriodId, setDuesPeriodId] = useState<string | undefined>(
    route.params?.duesPeriodId,
  );
  const [poolId, setPoolId] = useState<string | undefined>(
    route.params?.poolId,
  );
  const [memberId, setMemberId] = useState<string | undefined>(
    route.params?.memberId,
  );
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Set<LedgerType>>(
    new Set(),
  );
  const [includeArchived, setIncludeArchived] = useState(false);
  const [includeWithdrawRequests, setIncludeWithdrawRequests] =
    useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [generating, setGenerating] = useState(false);
  const [modal, setModal] = useState<{
    visible: boolean;
    type: FeedbackModalType;
    title: string;
    message: string;
    onPrimary: () => void;
  } | null>(null);
  const closeModal = () => setModal(null);

  const toggleChargeType = (value: LedgerType) => {
    setSelectedTypes((current) => {
      const next = new Set(current);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  };

  const selectedMember = memberId
    ? members.find((member) => member.uid === memberId)
    : undefined;
  const memberQuery = memberSearch.trim().toLowerCase();
  const memberMatches = memberQuery
    ? members
        .filter((member) =>
          `${member.fullName} ${member.email} ${member.phone}`
            .toLowerCase()
            .includes(memberQuery),
        )
        .slice(0, 20)
    : [];

  const parsedStart = parseDateFilter(startDate);
  const parsedEnd = parseDateFilter(endDate);

  const reportData = useMemo(() => {
    if (reportType === "dues") {
      return buildDuesReportData(ledgerEntries, duesPeriods, members, {
        duesPeriodId,
      });
    }
    if (reportType === "ledger") {
      return buildLedgerReportData(ledgerEntries, members, {
        startDate: parsedStart,
        endDate: parsedEnd,
        types: selectedTypes.size > 0 ? Array.from(selectedTypes) : undefined,
        includeArchived,
      });
    }
    if (reportType === "contributions") {
      return buildContributionsReportData(
        contributionEntries,
        pools,
        withdrawRequests,
        members,
        { poolId, includeWithdrawRequests },
      );
    }
    if (!selectedMember) {
      return null;
    }
    return buildMemberStatementData(
      ledgerEntries,
      contributionEntries,
      selectedMember,
      { startDate: parsedStart, endDate: parsedEnd },
    );
  }, [
    reportType,
    ledgerEntries,
    duesPeriods,
    members,
    duesPeriodId,
    parsedStart,
    parsedEnd,
    selectedTypes,
    includeArchived,
    contributionEntries,
    pools,
    withdrawRequests,
    poolId,
    includeWithdrawRequests,
    selectedMember,
  ]);

  const handleDownload = async () => {
    if (!reportData || generating) {
      return;
    }
    setGenerating(true);
    try {
      const scopeLabel =
        reportType === "dues"
          ? (duesPeriods.find((period) => period.id === duesPeriodId)?.name ??
            "all-periods")
          : reportType === "contributions"
            ? (pools.find((item) => item.id === poolId)?.name ?? "all-pools")
            : reportType === "statement"
              ? (selectedMember?.fullName ?? "member")
              : "all";
      const fileNameBase = `${reportType}-report-${slugify(scopeLabel)}`;
      await exportReport(reportData, fileFormat, fileNameBase);
    } catch (error) {
      setModal({
        visible: true,
        type: "error",
        title: "Could not generate report",
        message:
          error instanceof Error ? error.message : "Please try again.",
        onPrimary: closeModal,
      });
    } finally {
      setGenerating(false);
    }
  };

  if (!admin) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Reports"
          showBack
          onBack={() => safeGoBack(navigation, "FinanceAdmin")}
        />
        <EmptyState
          icon="!"
          title="Admin only"
          message="Only admins can download reports."
        />
      </SafeAreaView>
    );
  }

  if (financeLoading || contributionsLoading || membersLoading) {
    return <LoadingSpinner />;
  }

  if (financeError || contributionsError || membersError) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Reports"
          showBack
          onBack={() => safeGoBack(navigation, "FinanceAdmin")}
        />
        <EmptyState
          icon="!"
          title="Reports unavailable"
          message={financeError ?? contributionsError ?? membersError ?? "Please try again."}
        />
      </SafeAreaView>
    );
  }

  const canDownload =
    Boolean(reportData) &&
    (reportType !== "statement" || Boolean(selectedMember));

  return (
    <SafeAreaView style={styles.safe}>
      {modal && (
        <FeedbackModal
          visible={modal.visible}
          type={modal.type}
          title={modal.title}
          message={modal.message}
          onPrimary={modal.onPrimary}
        />
      )}
      <ScreenHeader
        title="Reports"
        showBack
        onBack={() => safeGoBack(navigation, "FinanceAdmin")}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionLabel}>REPORT TYPE</Text>
        <ChipRow
          options={REPORT_TYPE_OPTIONS}
          selectedValue={reportType}
          onChange={setReportType}
        />

        {reportType === "dues" && (
          <View style={styles.filterGroup}>
            <Text style={styles.sectionLabel}>DUES PERIOD</Text>
            <ChipRow
              options={[
                { label: "All periods", value: ALL_SENTINEL },
                ...duesPeriods.map((period) => ({
                  label: period.name,
                  value: period.id,
                })),
              ]}
              selectedValue={duesPeriodId ?? ALL_SENTINEL}
              onChange={(value) =>
                setDuesPeriodId(value === ALL_SENTINEL ? undefined : value)
              }
            />
          </View>
        )}

        {reportType === "ledger" && (
          <View style={styles.filterGroup}>
            <Text style={styles.sectionLabel}>CHARGE TYPES</Text>
            <View style={styles.chipRow}>
              {CHARGE_TYPE_OPTIONS.map((option) => {
                const active = selectedTypes.has(option.value);
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => toggleChargeType(option.value)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        active && styles.chipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.helperText}>
              Leave all unselected to include every charge type.
            </Text>
            <View style={styles.dateRow}>
              <CalendarDateField
                label="From"
                value={startDate}
                onChange={setStartDate}
                allowEmpty
                style={styles.dateField}
              />
              <CalendarDateField
                label="To"
                value={endDate}
                onChange={setEndDate}
                allowEmpty
                style={styles.dateField}
              />
            </View>
            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <Text style={styles.toggleLabel}>Include archived members</Text>
                <Text style={styles.toggleHelp}>
                  Adds balances retained for deleted accounts.
                </Text>
              </View>
              <Switch
                value={includeArchived}
                onValueChange={setIncludeArchived}
                trackColor={{
                  false: colors.bg.elevated,
                  true: colors.gold.dark,
                }}
                thumbColor={colors.bg.secondary}
              />
            </View>
          </View>
        )}

        {reportType === "contributions" && (
          <View style={styles.filterGroup}>
            <Text style={styles.sectionLabel}>CONTRIBUTION POOL</Text>
            <ChipRow
              options={[
                { label: "All pools", value: ALL_SENTINEL },
                ...pools.map((pool) => ({ label: pool.name, value: pool.id })),
              ]}
              selectedValue={poolId ?? ALL_SENTINEL}
              onChange={(value) =>
                setPoolId(value === ALL_SENTINEL ? undefined : value)
              }
            />
            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <Text style={styles.toggleLabel}>Include withdrawal requests</Text>
                <Text style={styles.toggleHelp}>
                  Adds a section listing pending/approved/paid withdrawals.
                </Text>
              </View>
              <Switch
                value={includeWithdrawRequests}
                onValueChange={setIncludeWithdrawRequests}
                trackColor={{
                  false: colors.bg.elevated,
                  true: colors.gold.dark,
                }}
                thumbColor={colors.bg.secondary}
              />
            </View>
          </View>
        )}

        {reportType === "statement" && (
          <View style={styles.filterGroup}>
            <Text style={styles.sectionLabel}>MEMBER</Text>
            {selectedMember ? (
              <View style={styles.selectedMemberRow}>
                <Avatar
                  initials={getInitials(selectedMember.fullName)}
                  photoURL={selectedMember.photoURL}
                />
                <View style={styles.selectedMemberCopy}>
                  <Text style={styles.memberName}>
                    {selectedMember.fullName}
                  </Text>
                  <Text style={styles.memberMeta}>{selectedMember.email}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setMemberId(undefined);
                    setMemberSearch("");
                  }}
                  style={styles.changeMemberButton}
                  activeOpacity={0.8}
                >
                  <Text style={styles.changeMemberText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TextInput
                  value={memberSearch}
                  onChangeText={setMemberSearch}
                  placeholder="Search name, email, or phone"
                  placeholderTextColor={colors.text.tertiary}
                  style={styles.memberSearch}
                  autoCorrect={false}
                />
                {memberMatches.map((member) => (
                  <TouchableOpacity
                    key={member.uid}
                    style={styles.memberRow}
                    onPress={() => {
                      setMemberId(member.uid);
                      setMemberSearch("");
                    }}
                    activeOpacity={0.8}
                  >
                    <Avatar
                      initials={getInitials(member.fullName)}
                      photoURL={member.photoURL}
                    />
                    <View style={styles.selectedMemberCopy}>
                      <Text style={styles.memberName}>{member.fullName}</Text>
                      <Text style={styles.memberMeta}>{member.email}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
                {memberQuery && memberMatches.length === 0 && (
                  <Text style={styles.helperText}>No members match your search.</Text>
                )}
              </>
            )}
            <View style={styles.dateRow}>
              <CalendarDateField
                label="From"
                value={startDate}
                onChange={setStartDate}
                allowEmpty
                style={styles.dateField}
              />
              <CalendarDateField
                label="To"
                value={endDate}
                onChange={setEndDate}
                allowEmpty
                style={styles.dateField}
              />
            </View>
          </View>
        )}

        <Text style={styles.sectionLabel}>FORMAT</Text>
        <ChipRow
          options={FORMAT_OPTIONS}
          selectedValue={fileFormat}
          onChange={setFileFormat}
        />

        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <Icon name="file-text" size={18} color={colors.gold.default} />
            <View style={styles.previewHeaderCopy}>
              <Text style={styles.previewTitle}>
                {reportData?.title ?? "Choose filters to preview"}
              </Text>
              {reportData?.subtitle && (
                <Text style={styles.previewSubtitle}>
                  {reportData.subtitle}
                </Text>
              )}
            </View>
          </View>
          {reportData?.summary.map((item) => (
            <View key={item.label} style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{item.label}</Text>
              <Text style={styles.summaryValue}>{item.value}</Text>
            </View>
          ))}
          {reportType === "statement" && !selectedMember && (
            <Text style={styles.helperText}>
              Select a member above to preview their statement.
            </Text>
          )}
        </View>

        <GoldButton
          label={
            generating
              ? "Preparing…"
              : `Download ${fileFormat.toUpperCase()}`
          }
          onPress={handleDownload}
          loading={generating}
          disabled={!canDownload}
          fullWidth
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg.secondary },
    content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
    sectionLabel: {
      marginTop: spacing.sm,
      fontSize: typography.size.xs,
      color: colors.text.secondary,
      fontWeight: typography.weight.bold,
      letterSpacing: 0.8,
    },
    filterGroup: { gap: spacing.sm },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    chip: {
      minHeight: 40,
      paddingHorizontal: spacing.lg,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border.subtle,
      backgroundColor: colors.bg.card,
    },
    chipActive: {
      borderColor: colors.gold.default,
      backgroundColor: `${colors.gold.default}18`,
    },
    chipText: {
      fontSize: typography.size.sm,
      fontWeight: typography.weight.semibold,
      color: colors.text.secondary,
    },
    chipTextActive: { color: colors.gold.light },
    helperText: {
      fontSize: typography.size.xs,
      color: colors.text.tertiary,
    },
    dateRow: { flexDirection: "row", gap: spacing.md },
    dateField: { flex: 1 },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border.subtle,
      backgroundColor: colors.bg.card,
    },
    toggleCopy: { flex: 1, gap: 2 },
    toggleLabel: {
      fontSize: typography.size.sm,
      fontWeight: typography.weight.semibold,
      color: colors.text.primary,
    },
    toggleHelp: { fontSize: typography.size.xs, color: colors.text.secondary },
    memberSearch: {
      minHeight: 48,
      padding: spacing.md,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.border.subtle,
      backgroundColor: colors.bg.tertiary,
      color: colors.text.primary,
    },
    memberRow: {
      minHeight: 64,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: 8,
      backgroundColor: colors.bg.card,
    },
    selectedMemberRow: {
      minHeight: 64,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.gold.default,
      backgroundColor: colors.bg.card,
    },
    selectedMemberCopy: { flex: 1, gap: spacing.xs },
    memberName: {
      fontSize: typography.size.base,
      fontWeight: typography.weight.bold,
      color: colors.text.primary,
    },
    memberMeta: { fontSize: typography.size.sm, color: colors.text.secondary },
    changeMemberButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 8,
      backgroundColor: colors.bg.elevated,
    },
    changeMemberText: {
      fontSize: typography.size.xs,
      fontWeight: typography.weight.bold,
      color: colors.gold.light,
    },
    previewCard: {
      gap: spacing.sm,
      padding: spacing.lg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border.subtle,
      backgroundColor: colors.bg.card,
    },
    previewHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
    previewHeaderCopy: { flex: 1, gap: 2 },
    previewTitle: {
      fontSize: typography.size.base,
      fontWeight: typography.weight.bold,
      color: colors.text.primary,
    },
    previewSubtitle: {
      fontSize: typography.size.sm,
      color: colors.text.secondary,
    },
    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    summaryLabel: { fontSize: typography.size.sm, color: colors.text.secondary },
    summaryValue: {
      fontSize: typography.size.sm,
      fontWeight: typography.weight.bold,
      color: colors.text.primary,
    },
  });

export default ReportsScreen;
