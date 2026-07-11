import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  ScrollView,
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
import BalanceBanner from "../../components/finance/BalanceBanner";
import LedgerRow from "../../components/finance/LedgerRow";
import { subscribeToLedger } from "../../services/financeService";
import {
  getMember,
  getMemberDirectoryProfile,
} from "../../services/membersService";
import { useAuthStore } from "../../store/authStore";
import { colors, spacing, typography } from "../../theme";
import {
  getFinanceStanding,
  getFinanceStandingBannerLabel,
  getFinanceStandingColor,
} from "../../utils/financeStanding";
import { LedgerEntry } from "../../types/finance";
import { User } from "../../types/user";
import { getFinanceTotals } from "../../utils/financeTotals";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDisplayDate } from "../../utils/formatDate";
import { getInitials } from "../../utils/getInitials";
import {
  canViewMemberFamilyDetails,
  canViewMemberFinanceDetails,
  canViewMemberPrivateDetails,
  getVisibleMemberProfileTabs,
  sanitizeMemberProfile,
} from "../../utils/memberPrivacy";
import { safeGoBack } from "../../utils/navigation";
import { isAdmin } from "../../utils/roleGuard";

const getAgeFromDateOfBirth = (dateOfBirth: string): number | null => {
  const parsed = new Date(dateOfBirth);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const birthdayPassed =
    today.getMonth() > parsed.getMonth() ||
    (today.getMonth() === parsed.getMonth() &&
      today.getDate() >= parsed.getDate());

  if (!birthdayPassed) {
    age -= 1;
  }

  return age >= 0 ? age : null;
};

const formatChildDateOfBirth = (dateOfBirth: string): string => {
  const age = getAgeFromDateOfBirth(dateOfBirth);
  if (age === null) {
    return dateOfBirth;
  }
  return `${dateOfBirth} (${age} ${age === 1 ? "year" : "years"} old)`;
};

const MemberProfileScreen = ({ navigation, route }: any) => {
  const memberId = route.params?.memberId as string | undefined;
  const [member, setMember] = useState<User | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "family" | "finance">(
    "info",
  );
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const { user } = useAuthStore();

  // Refetches on focus so edits from the member form show without a reload.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoadError(null);
      if (!memberId) {
        setLoadError("This profile could not be found.");
        return;
      }
      const canLoadFullProfile = isAdmin(user) || user?.uid === memberId;
      const loadMember = canLoadFullProfile
        ? getMember
        : getMemberDirectoryProfile;
      loadMember(memberId)
        .then((nextMember) => {
          if (active) {
            setMember(nextMember);
          }
        })
        .catch((error) => {
          if (active) {
            setLoadError(
              error instanceof Error
                ? error.message
                : "Could not load this profile.",
            );
          }
        });
      return () => {
        active = false;
      };
    }, [memberId, user]),
  );

  useEffect(() => {
    if (!member || !canViewMemberFinanceDetails(user, member)) {
      setLedgerEntries([]);
      return;
    }
    setLedgerLoading(true);
    setLedgerError(null);
    const unsubscribe = subscribeToLedger(
      member.uid,
      (entries) => {
        setLedgerEntries(entries);
        setLedgerLoading(false);
      },
      (error) => {
        setLedgerError(error.message || "Could not load transactions.");
        setLedgerLoading(false);
      },
    );
    return () => unsubscribe();
  }, [member, user]);

  const sortedLedgerEntries = useMemo(
    () =>
      [...ledgerEntries].sort((left, right) => {
        const leftDate = left.paidAt ?? left.dueDate;
        const rightDate = right.paidAt ?? right.dueDate;
        return (rightDate?.getTime() ?? 0) - (leftDate?.getTime() ?? 0);
      }),
    [ledgerEntries],
  );
  const {
    outstanding: ledgerOutstanding,
    totalCharged,
    totalPaid,
  } = getFinanceTotals(sortedLedgerEntries);

  if (loadError) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Profile"
          showBack
          onBack={() => safeGoBack(navigation, "MembersList")}
        />
        <EmptyState
          icon="!"
          title="Profile unavailable"
          message={loadError}
          actionLabel="Back to Members"
          onAction={() => safeGoBack(navigation, "MembersList")}
        />
      </SafeAreaView>
    );
  }

  if (!member) {
    return <LoadingSpinner />;
  }

  const canViewPrivate = canViewMemberPrivateDetails(user, member);
  const canViewFinance = canViewMemberFinanceDetails(user, member);
  const canViewFamily = canViewMemberFamilyDetails(user, member);
  const financeStanding = getFinanceStanding(
    member.financialStatus,
    member.outstandingBalance,
  );
  const financeStandingColor = getFinanceStandingColor(financeStanding);
  const canEditMember = isAdmin(user);
  const profile = sanitizeMemberProfile(member);
  const tabs = getVisibleMemberProfileTabs(user, member);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Profile"
        showBack
        onBack={() => safeGoBack(navigation, "MembersList")}
        rightElement={
          canEditMember ? (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() =>
                navigation.navigate("MemberForm", { memberId: member.uid })
              }
              activeOpacity={0.85}
            >
              <Icon name="edit-2" size={18} color={colors.text.onGold} />
            </TouchableOpacity>
          ) : null
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Avatar
            initials={getInitials(profile.displayName)}
            photoURL={member.photoURL}
            size={64}
            statusDot={canViewFinance ? member.financialStatus : null}
          />
          <Text style={styles.name}>{profile.displayName}</Text>
          <View style={styles.badgeRow}>
            <Badge
              label={member.role.replace("_", " ").toUpperCase()}
              color={colors.gold.default}
            />
            <Badge
              label={
                profile.memberSince
                  ? `SINCE ${profile.memberSince.getFullYear()}`
                  : "SINCE UNKNOWN"
              }
              color={colors.text.secondary}
            />
          </View>
          {canViewFinance && (
            <View
              style={[
                styles.statusBanner,
                {
                  backgroundColor: `${financeStandingColor}18`,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: financeStandingColor },
                ]}
              >
                {getFinanceStandingBannerLabel(financeStanding)}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.tabs}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.activeTabText,
                ]}
              >
                {tab.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {activeTab === "info" && (
          <View style={styles.card}>
            <Info label="Phone" value={profile.phone} />
            <Info label="Email" value={profile.email} />
            {canViewPrivate && <Info label="Address" value={profile.address} />}
            {canViewFamily && (
              <Info label="Marital Status" value={profile.maritalStatus} />
            )}
            <Info
              label="Member Since"
              value={
                profile.memberSince
                  ? formatDisplayDate(profile.memberSince)
                  : "Not provided"
              }
            />
          </View>
        )}
        {activeTab === "family" && canViewFamily && (
          <View style={styles.card}>
            {member.maritalStatus === "married" && profile.spouseName && (
              <Info label="Spouse" value={profile.spouseName} />
            )}
            <Text style={styles.familySectionLabel}>
              Children ({profile.children.length})
            </Text>
            {profile.children.length === 0 ? (
              <Text style={styles.emptyText}>No children recorded.</Text>
            ) : (
              profile.children.map((child) => (
                <Info
                  key={child.name}
                  label={child.name}
                  value={formatChildDateOfBirth(child.dateOfBirth)}
                />
              ))
            )}
          </View>
        )}
        {activeTab === "finance" &&
          (canViewFinance ? (
            <>
              <BalanceBanner
                outstanding={
                  ledgerLoading || ledgerError
                    ? member.outstandingBalance
                    : ledgerOutstanding
                }
                financialStatus={member.financialStatus}
              />
              {ledgerLoading ? (
                <View style={styles.ledgerLoading}>
                  <ActivityIndicator color={colors.gold.default} />
                </View>
              ) : ledgerError ? (
                <Text style={styles.emptyText}>{ledgerError}</Text>
              ) : (
                <>
                  <View style={styles.summaryRow}>
                    <SummaryStat
                      label="Charged"
                      value={formatCurrency(totalCharged)}
                    />
                    <SummaryStat
                      label="Paid"
                      value={formatCurrency(totalPaid)}
                    />
                    <SummaryStat
                      label="Outstanding"
                      value={formatCurrency(ledgerOutstanding)}
                      tone={financeStandingColor}
                    />
                  </View>
                  <Text style={styles.sectionLabel}>TRANSACTION HISTORY</Text>
                  {sortedLedgerEntries.length === 0 ? (
                    <Text style={styles.emptyText}>
                      No transactions recorded.
                    </Text>
                  ) : (
                    <View style={styles.ledgerList}>
                      {sortedLedgerEntries.map((entry) => (
                        <LedgerRow key={entry.id} entry={entry} />
                      ))}
                    </View>
                  )}
                </>
              )}
            </>
          ) : (
            <Text style={styles.restricted}>
              You do not have permission to view this information.
            </Text>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const Info = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const SummaryStat = ({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: string;
  value: string;
}) => (
  <View style={styles.summaryStat}>
    <Text style={[styles.summaryValue, tone ? { color: tone } : null]}>
      {value}
    </Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  content: { padding: spacing.lg, gap: spacing.lg },
  hero: {
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: 8,
    backgroundColor: colors.bg.card,
  },
  name: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
  },
  badgeRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  statusBanner: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  statusText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.6,
  },
  tabs: {
    flexDirection: "row",
    borderRadius: 8,
    backgroundColor: colors.bg.card,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },
  activeTab: { backgroundColor: colors.gold.default },
  tabText: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    fontWeight: typography.weight.bold,
  },
  activeTabText: { color: colors.text.onGold },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    backgroundColor: colors.bg.card,
  },
  infoRow: { gap: spacing.xs },
  infoLabel: { fontSize: typography.size.xs, color: colors.text.secondary },
  infoValue: { fontSize: typography.size.base, color: colors.text.primary },
  familySectionLabel: {
    marginTop: spacing.xs,
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  emptyText: { color: colors.text.secondary },
  restricted: { color: colors.status.error, textAlign: "center" },
  ledgerLoading: {
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  ledgerList: { gap: spacing.md },
  summaryRow: { flexDirection: "row", gap: spacing.sm },
  summaryStat: {
    flex: 1,
    minHeight: 70,
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.bg.card,
  },
  summaryValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
  },
  summaryLabel: { fontSize: typography.size.xs, color: colors.text.secondary },
  sectionLabel: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.8,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.gold.default,
  },
});

export default MemberProfileScreen;
