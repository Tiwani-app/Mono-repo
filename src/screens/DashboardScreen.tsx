import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "../components/common/FeatherIcon";
import { SafeAreaView } from "react-native-safe-area-context";
import Badge from "../components/common/Badge";
import EmptyState from "../components/common/EmptyState";
import EventCard from "../components/events/EventCard";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useEvents } from "../hooks/useEvents";
import { useFinance } from "../hooks/useFinance";
import { useJoinRequests } from "../hooks/useJoinRequests";
import { useMembers } from "../hooks/useMembers";
import { useNotifications } from "../hooks/useNotifications";
import { colors, spacing, typography } from "../theme";
import {
  getFinanceStanding,
  getFinanceStandingColor,
} from "../utils/financeStanding";
import { getFinanceTotals } from "../utils/financeTotals";
import { visibleUpcomingEvents } from "../utils/eventGuards";
import { formatCurrency } from "../utils/formatCurrency";
import { formatRelativeTime } from "../utils/formatDate";
import {
  formatPendingReviewCount,
  getPendingJoinRequests,
} from "../utils/joinRequests";
import { isAdmin } from "../utils/roleGuard";
import { useAuthStore } from "../store/authStore";
import { getDashboardQuickActions } from "./dashboardQuickActions";

const StatTile = ({ accentColor, label, onPress, subLabel, value }: any) => (
  <TouchableOpacity
    disabled={!onPress}
    onPress={onPress}
    activeOpacity={0.85}
    style={[styles.statTile, { borderTopColor: accentColor }]}
  >
    <View style={styles.statMainAction}>
      <Text style={styles.statValue}>{value}</Text>
      <View style={styles.statLabelRow}>
        <Text style={styles.statLabel}>{label}</Text>
        {onPress ? (
          <Icon name="chevron-right" size={14} color={colors.text.tertiary} />
        ) : null}
      </View>
      <Text style={styles.statSub}>{subLabel}</Text>
    </View>
  </TouchableOpacity>
);

const QuickAction = ({ icon, label, onPress }: any) => (
  <TouchableOpacity
    style={styles.quickAction}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Icon name={icon} size={18} color={colors.gold.default} />
    <Text style={styles.quickLabel}>{label}</Text>
  </TouchableOpacity>
);

const RequestReviewAction = ({ count, onPress }: any) => (
  <TouchableOpacity
    style={styles.requestReview}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <View style={styles.requestIcon}>
      <Icon name="inbox" size={18} color={colors.gold.default} />
    </View>
    <View style={styles.requestCopy}>
      <Text style={styles.requestTitle}>Join Requests</Text>
      <Text style={styles.requestMeta}>{formatPendingReviewCount(count)}</Text>
    </View>
    <Icon name="chevron-right" size={18} color={colors.text.tertiary} />
  </TouchableOpacity>
);

const DashboardScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const admin = isAdmin(user);
  const { events, error: eventsError, loading: eventsLoading } = useEvents();
  const {
    duesPeriods,
    error: financeError,
    ledgerEntries,
    loading: financeLoading,
  } = useFinance(undefined, admin);
  const {
    members,
    error: membersError,
    loading: membersLoading,
  } = useMembers({
    enabled: admin,
  });
  const {
    error: requestsError,
    loading: requestsLoading,
    requests,
  } = useJoinRequests({ enabled: admin });
  const {
    error: notificationsError,
    loading: notificationsLoading,
    notifications,
    unreadCount,
  } = useNotifications();
  const firstName = user?.fullName.split(" ")[0] ?? "there";
  const quickActions = getDashboardQuickActions(admin, navigation);
  const pendingRequests = getPendingJoinRequests(requests);
  const upcomingEvents = visibleUpcomingEvents(events);
  const activeMembers = members.filter((member) => member.status === "active");
  const overdueMembers = members.filter(
    (member) =>
      getFinanceStanding(member.financialStatus, member.outstandingBalance) ===
      "overdue",
  );
  const userFinanceStanding = getFinanceStanding(
    user?.financialStatus,
    user?.outstandingBalance ?? 0,
  );
  const { totalPaid: totalCollected } = getFinanceTotals(ledgerEntries);
  const currentDuesPeriod =
    duesPeriods.find((period) => period.status === "active") ?? duesPeriods[0];
  const loading =
    eventsLoading ||
    membersLoading ||
    notificationsLoading ||
    requestsLoading ||
    (admin && financeLoading);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.kicker}>Good morning,</Text>
            <Text style={styles.name}>{firstName}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => navigation.navigate("Notifications")}
              style={styles.headerButton}
            >
              <Icon name="bell" size={18} color={colors.text.secondary} />
              {unreadCount > 0 && <View style={styles.badgeDot} />}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate("Settings")}
              style={styles.headerButton}
            >
              <Icon name="settings" size={18} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsGrid}>
          {admin ? (
            <>
              <StatTile
                value={String(members.length)}
                label="Members"
                subLabel={`${activeMembers.length} active`}
                accentColor={colors.gold.default}
                onPress={() => navigation.navigate("MembersList")}
              />
              <StatTile
                value={String(upcomingEvents.length)}
                label="Events"
                subLabel="upcoming"
                accentColor={colors.status.info}
              />
              <StatTile
                value={formatCurrency(totalCollected)}
                label="Collected"
                subLabel={currentDuesPeriod?.name ?? "all periods"}
                accentColor={colors.status.success}
              />
              <StatTile
                value={String(overdueMembers.length)}
                label="Overdue"
                subLabel={overdueMembers.length === 1 ? "member" : "members"}
                accentColor={colors.status.error}
              />
            </>
          ) : (
            <>
              <StatTile
                value={String(upcomingEvents.length)}
                label="Events"
                subLabel="upcoming"
                accentColor={colors.status.info}
              />
              <StatTile
                value={
                  userFinanceStanding === "clear"
                    ? "Clear"
                    : userFinanceStanding === "overdue"
                      ? "Overdue"
                      : "Balance"
                }
                label="My Status"
                subLabel={
                  userFinanceStanding === "clear"
                    ? "good standing"
                    : userFinanceStanding === "overdue"
                      ? "dues overdue"
                      : "dues due"
                }
                accentColor={getFinanceStandingColor(userFinanceStanding)}
              />
            </>
          )}
        </View>

        {admin && pendingRequests.length > 0 && (
          <RequestReviewAction
            count={pendingRequests.length}
            onPress={() => navigation.navigate("JoinRequests")}
          />
        )}

        {admin && (membersError || requestsError || financeError) && (
          <EmptyState
            icon="!"
            title="Admin summary unavailable"
            message={
              membersError ??
              requestsError ??
              financeError ??
              "Please try again."
            }
          />
        )}

        <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
        <View style={styles.quickGrid}>
          {quickActions.map(({ icon, label, onPress }) => (
            <QuickAction
              key={label}
              icon={icon}
              label={label}
              onPress={onPress}
            />
          ))}
        </View>

        <Text style={styles.sectionLabel}>UPCOMING</Text>
        {eventsError ? (
          <EmptyState
            icon="!"
            title="Events unavailable"
            message={eventsError}
          />
        ) : upcomingEvents.length === 0 ? (
          <EmptyState
            icon="!"
            title="No upcoming events"
            message="New events will appear here."
          />
        ) : (
          upcomingEvents.slice(0, 2).map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onPress={() =>
                navigation.navigate("Events", {
                  screen: "EventDetail",
                  params: { eventId: event.id },
                })
              }
            />
          ))
        )}

        <Text style={styles.sectionLabel}>RECENT ACTIVITY</Text>
        {notificationsError ? (
          <EmptyState
            icon="!"
            title="Activity unavailable"
            message={notificationsError}
          />
        ) : notifications.length === 0 ? (
          <EmptyState
            icon="!"
            title="No recent activity"
            message="Updates will appear here."
          />
        ) : (
          notifications.slice(0, 3).map((item) => (
            <View key={item.id} style={styles.activityRow}>
              <Badge
                label={item.type.toUpperCase()}
                color={colors.gold.default}
              />
              <View style={styles.activityText}>
                <Text style={styles.activityTitle}>{item.title}</Text>
                <Text style={styles.activityTime}>
                  {formatRelativeTime(item.sentAt)}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  content: { padding: spacing.lg, gap: spacing.lg },
  greetingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kicker: { fontSize: typography.size.base, color: colors.text.secondary },
  name: {
    fontSize: typography.size.xxxl,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
  },
  headerActions: { flexDirection: "row", gap: spacing.sm },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg.card,
  },
  badgeDot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.status.error,
  },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  statTile: {
    width: "48%",
    minHeight: 96,
    padding: spacing.md,
    borderTopWidth: 3,
    borderRadius: 8,
    backgroundColor: colors.bg.card,
  },
  statMainAction: { gap: spacing.xs },
  statValue: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
  },
  statLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  statLabel: { fontSize: typography.size.base, color: colors.text.secondary },
  statSub: { fontSize: typography.size.sm, color: colors.text.tertiary },
  sectionLabel: {
    marginTop: spacing.sm,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.text.secondary,
    letterSpacing: 0.8,
  },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  quickAction: {
    width: "31%",
    minHeight: 72,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.bg.card,
  },
  quickLabel: {
    fontSize: typography.size.xs,
    color: colors.text.primary,
    textAlign: "center",
  },
  requestReview: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  requestIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg.elevated,
  },
  requestCopy: { flex: 1, gap: spacing.xs },
  requestTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  requestMeta: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  activityRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.bg.card,
  },
  activityText: { flex: 1, gap: spacing.xs },
  activityTitle: { fontSize: typography.size.base, color: colors.text.primary },
  activityTime: { fontSize: typography.size.sm, color: colors.text.tertiary },
});

export default DashboardScreen;
