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
import EventCard from "../components/events/EventCard";
import { useEvents } from "../hooks/useEvents";
import { useNotifications } from "../hooks/useNotifications";
import { colors, spacing, typography } from "../theme";
import { formatCurrency } from "../utils/formatCurrency";
import { formatRelativeTime } from "../utils/formatDate";
import { isAdmin } from "../utils/roleGuard";
import { useAuthStore } from "../store/authStore";
import { getDashboardQuickActions } from "./dashboardQuickActions";

const StatTile = ({ accentColor, label, subLabel, value }: any) => (
  <View style={[styles.statTile, { borderTopColor: accentColor }]}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statSub}>{subLabel}</Text>
  </View>
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

const DashboardScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const { events } = useEvents();
  const { notifications, unreadCount } = useNotifications();
  const admin = isAdmin(user);
  const firstName = user?.fullName.split(" ")[0] ?? "there";
  const quickActions = getDashboardQuickActions(admin, navigation);

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
                value="3"
                label="Members"
                subLabel="requests ready"
                accentColor={colors.gold.default}
              />
              <StatTile
                value={String(events.length)}
                label="Events"
                subLabel="upcoming"
                accentColor={colors.status.info}
              />
              <StatTile
                value={formatCurrency(30000)}
                label="Collected"
                subLabel="Q2 2026"
                accentColor={colors.status.success}
              />
              <StatTile
                value="1"
                label="Overdue"
                subLabel="member"
                accentColor={colors.status.error}
              />
            </>
          ) : (
            <>
              <StatTile
                value={String(events.length)}
                label="Events"
                subLabel="upcoming"
                accentColor={colors.status.info}
              />
              <StatTile
                value={user?.financialStatus === "green" ? "Green" : "Red"}
                label="My Status"
                subLabel={
                  user?.financialStatus === "green" ? "clear" : "dues due"
                }
                accentColor={
                  user?.financialStatus === "green"
                    ? colors.status.success
                    : colors.status.error
                }
              />
            </>
          )}
        </View>

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
        {events.slice(0, 2).map((event) => (
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
        ))}

        <Text style={styles.sectionLabel}>RECENT ACTIVITY</Text>
        {notifications.slice(0, 3).map((item) => (
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
        ))}
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
  statValue: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
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
