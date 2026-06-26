import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Badge from "../components/common/Badge";
import EmptyState from "../components/common/EmptyState";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ScreenHeader from "../components/common/ScreenHeader";
import { useAuditLogs } from "../hooks/useAuditLogs";
import { useAuthStore } from "../store/authStore";
import { colors, spacing, typography } from "../theme";
import { AuditLog } from "../types/audit";
import { formatDisplayDate, formatEventTime } from "../utils/formatDate";
import { safeGoBack } from "../utils/navigation";
import { isAdmin } from "../utils/roleGuard";

const actionLabel = (action: string) =>
  action
    .split(".")
    .map((part) => part.replace(/_/g, " "))
    .join(" / ");

const formatDetails = (details: Record<string, unknown>) => {
  const entries = Object.entries(details).filter(([, value]) => {
    if (value === null || value === undefined || value === "") {
      return false;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return true;
  });
  if (entries.length === 0) {
    return "No extra details";
  }
  return entries
    .slice(0, 4)
    .map(([key, value]) => {
      const normalizedValue =
        typeof value === "object" ? JSON.stringify(value) : String(value);
      return `${key}: ${normalizedValue}`;
    })
    .join(" · ");
};

const AuditCard = ({ item }: { item: AuditLog }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={styles.titleBlock}>
        <Text style={styles.action}>{actionLabel(item.action)}</Text>
        <Text style={styles.time}>
          {formatDisplayDate(item.createdAt)} · {formatEventTime(item.createdAt)}
        </Text>
      </View>
      <Badge label={(item.actorRole ?? "system").toUpperCase()} color={colors.gold.default} />
    </View>
    <Text style={styles.target}>{item.targetPath}</Text>
    <Text style={styles.actor}>Actor: {item.actorUid ?? "system"}</Text>
    <Text style={styles.details}>{formatDetails(item.details)}</Text>
  </View>
);

const AuditLogsScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const admin = isAdmin(user);
  const { error, loading, logs } = useAuditLogs({ enabled: admin });

  if (!admin) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Audit Logs"
          showBack
          onBack={() => safeGoBack(navigation, "Settings")}
        />
        <EmptyState
          icon="!"
          title="Admin only"
          message="Only admins can review production audit logs."
        />
      </SafeAreaView>
    );
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Audit Logs"
        showBack
        onBack={() => safeGoBack(navigation, "Settings")}
      />
      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Production review trail</Text>
            <Text style={styles.noticeCopy}>
              Latest 100 organisation audit entries for admin review and incident
              response.
            </Text>
          </View>
        }
        renderItem={({ item }) => <AuditCard item={item} />}
        ListEmptyComponent={
          <EmptyState
            icon="!"
            title={error ? "Audit logs unavailable" : "No audit logs yet"}
            message={error ?? "Privileged actions will appear here."}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  content: { padding: spacing.lg, gap: spacing.md },
  notice: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  noticeTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  noticeCopy: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: 8,
    backgroundColor: colors.bg.card,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  titleBlock: { flex: 1, gap: spacing.xs },
  action: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textTransform: "capitalize",
  },
  time: { fontSize: typography.size.xs, color: colors.text.tertiary },
  target: {
    fontSize: typography.size.sm,
    color: colors.gold.light,
    fontWeight: typography.weight.semibold,
  },
  actor: { fontSize: typography.size.sm, color: colors.text.secondary },
  details: { fontSize: typography.size.sm, color: colors.text.secondary, lineHeight: 20 },
});

export default AuditLogsScreen;
