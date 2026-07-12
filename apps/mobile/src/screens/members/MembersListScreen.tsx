import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "../../components/common/FeatherIcon";
import { SafeAreaView } from "react-native-safe-area-context";
import EmptyState from "../../components/common/EmptyState";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ScreenHeader from "../../components/common/ScreenHeader";
import SyncStatusBanner from "../../components/common/SyncStatusBanner";
import MemberCard from "../../components/members/MemberCard";
import { useFinance } from "../../hooks/useFinance";
import { useMembers } from "../../hooks/useMembers";
import { useAuthStore } from "../../store/authStore";
import { colors, spacing } from "../../theme";
import { MemberStatus, User } from "../../types/user";
import { isPastCalendarDay } from "../../utils/dateStatus";
import { getFinanceStanding } from "../../utils/financeStanding";
import { getChargeOutstanding } from "../../utils/financeTotals";
import { safeGoBack } from "../../utils/navigation";
import { isAdmin } from "../../utils/roleGuard";

type MemberListFilter =
  | "all"
  | MemberStatus
  | "paid"
  | "owing"
  | "overdue";

const memberFilters: { label: string; value: MemberListFilter }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Pending", value: "pending" },
  { label: "Inactive", value: "inactive" },
  { label: "Suspended", value: "suspended" },
  { label: "Paid", value: "paid" },
  { label: "Owing", value: "owing" },
  { label: "Overdue", value: "overdue" },
];

const statusFilterValues: MemberStatus[] = [
  "active",
  "pending",
  "inactive",
  "suspended",
];

type MemberFinanceSummary = {
  outstanding: number;
  overdue: number;
};

// Shared fallback so memoized MemberCard rows keep a stable prop identity.
const EMPTY_FINANCE_SUMMARY: MemberFinanceSummary = {
  outstanding: 0,
  overdue: 0,
};

const SEARCH_DEBOUNCE_MS = 150;

const matchesMemberFilter = (
  member: User,
  filter: MemberListFilter,
  financeSummary?: MemberFinanceSummary,
) => {
  if (filter === "all") {
    return true;
  }
  if (statusFilterValues.includes(filter as MemberStatus)) {
    return member.status === filter;
  }
  const standing = getFinanceStanding(
    member.financialStatus,
      member.outstandingBalance,
  );
  const outstanding = financeSummary?.outstanding ?? member.outstandingBalance;
  const overdue = financeSummary?.overdue ?? 0;
  if (filter === "paid") {
    return outstanding <= 0;
  }
  if (filter === "owing") {
    return outstanding > overdue;
  }
  return overdue > 0 || standing === "overdue";
};

const MembersListScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const admin = isAdmin(user);
  const canBrowseMembers = Boolean(user);
  const {
    ledgerEntries,
    loading: financeLoading,
  } = useFinance(undefined, admin);
  const {
    error,
    lastSyncedAt,
    loading,
    members,
    syncState,
  } = useMembers({
    enabled: canBrowseMembers,
    source: admin ? "users" : "directory",
  });
  const [memberFilter, setMemberFilter] =
    React.useState<MemberListFilter>("all");
  // The input updates instantly; the query used for filtering lags slightly so
  // typing doesn't re-filter and re-render the whole list on every keystroke.
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(
      () => setSearchQuery(searchInput),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [searchInput]);

  const financeSummaryByMember = useMemo(() => {
    const summary = new Map<string, MemberFinanceSummary>();
    ledgerEntries.forEach((entry) => {
      if (entry.type === "payment") {
        return;
      }
      const outstanding = getChargeOutstanding(entry);
      if (outstanding <= 0) {
        return;
      }
      const current = summary.get(entry.uid) ?? { outstanding: 0, overdue: 0 };
      summary.set(entry.uid, {
        outstanding: current.outstanding + outstanding,
        overdue:
          current.overdue +
          (entry.dueDate && isPastCalendarDay(entry.dueDate)
            ? outstanding
            : 0),
      });
    });
    return summary;
  }, [ledgerEntries]);

  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return members.filter((member) => {
      if (!admin && member.status !== "active") {
        return false;
      }
      const matchesFilter =
        !admin ||
        matchesMemberFilter(
          member,
          memberFilter,
          financeSummaryByMember.get(member.uid),
        );
      const searchableText = [member.fullName, member.email, member.phone]
        .join(" ")
        .toLowerCase();
      const matchesSearch = !query || searchableText.includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [admin, financeSummaryByMember, memberFilter, members, searchQuery]);

  const handlePressMember = useCallback(
    (member: User) =>
      navigation.navigate("MemberProfile", { memberId: member.uid }),
    [navigation],
  );

  const renderMember = useCallback(
    ({ item }: { item: User }) => (
      <MemberCard
        financeSummary={
          admin
            ? financeSummaryByMember.get(item.uid) ?? EMPTY_FINANCE_SUMMARY
            : undefined
        }
        member={item}
        showFinance={admin}
        onPress={handlePressMember}
      />
    ),
    [admin, financeSummaryByMember, handlePressMember],
  );

  if (loading || (admin && financeLoading)) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Members"
          showBack
          onBack={() => safeGoBack(navigation, "DashboardHome")}
        />
        <EmptyState icon="!" title="Members unavailable" message={error} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Members"
        showBack
        onBack={() => safeGoBack(navigation, "DashboardHome")}
        rightElement={
          admin ? (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate("MemberForm")}
            >
              <Icon name="user-plus" size={20} color={colors.text.onGold} />
            </TouchableOpacity>
          ) : null
        }
      />
      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => item.uid}
        initialNumToRender={12}
        windowSize={7}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <SyncStatusBanner state={syncState} lastSyncedAt={lastSyncedAt} />
            <TextInput
              value={searchInput}
              onChangeText={setSearchInput}
              placeholder="Search name, email, or phone"
              placeholderTextColor={colors.text.tertiary}
              style={styles.search}
            />
            {admin && (
              <View style={styles.filterRow}>
                {memberFilters.map((filter) => {
                  const selected = memberFilter === filter.value;
                  return (
                    <TouchableOpacity
                      key={filter.value}
                      style={[
                        styles.filterChip,
                        selected && styles.selectedFilterChip,
                      ]}
                      onPress={() => setMemberFilter(filter.value)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.filterText,
                          selected && styles.selectedFilterText,
                        ]}
                      >
                        {filter.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        }
        renderItem={renderMember}
        ListEmptyComponent={
          <EmptyState
            icon={searchQuery ? "🔍" : "👥"}
            title={searchQuery ? "No results" : "No members found"}
            message={
              searchQuery || memberFilter !== "all"
                ? "No members match the current search or filter."
                : "Active members will appear here once they are added."
            }
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  content: { padding: spacing.lg, gap: spacing.md },
  listHeader: { gap: spacing.md },
  search: {
    minHeight: 48,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.tertiary,
    color: colors.text.primary,
  },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  filterChip: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  selectedFilterChip: {
    borderColor: colors.gold.default,
    backgroundColor: `${colors.gold.default}22`,
  },
  filterText: {
    color: colors.text.secondary,
    fontWeight: "700",
  },
  selectedFilterText: { color: colors.gold.light },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.gold.default,
  },
});

export default MembersListScreen;
