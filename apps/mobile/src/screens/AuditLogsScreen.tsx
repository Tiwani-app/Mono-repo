import React, { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Badge from "../components/common/Badge";
import EmptyState from "../components/common/EmptyState";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ScreenHeader from "../components/common/ScreenHeader";
import { useAuditLogs } from "../hooks/useAuditLogs";
import { useMembers } from "../hooks/useMembers";
import { useAuthStore } from "../store/authStore";
import { colors, spacing, typography } from "../theme";
import { AuditLog } from "../types/audit";
import { User } from "../types/user";
import { formatDisplayDate, formatEventTime } from "../utils/formatDate";
import { safeGoBack } from "../utils/navigation";
import { isAdmin } from "../utils/roleGuard";

const actionLabel = (action: string) =>
  action
    .split(".")
    .map((part) => part.replace(/_/g, " "))
    .join(" / ");

const technicalIdKeys = new Set([
  "duesPeriodId",
  "eventId",
  "listingId",
  "notificationId",
  "notifId",
  "pollId",
  "requestId",
  "targetId",
]);

const collectionLabels: Record<string, string> = {
  announcements: "Notification",
  audit_logs: "Audit log",
  documents: "Document",
  dues_periods: "Dues period",
  elections: "Election",
  events: "Event",
  finance_contacts: "Finance contact",
  join_requests: "Join request",
  ledger_entries: "Ledger entry",
  marketplace: "Marketplace item",
  member_directory: "Member",
  polls: "Poll",
  users: "Member",
};

const personLabel = (uid: string | null | undefined, peopleByUid: Map<string, User>) => {
  if (!uid) {
    return "system";
  }
  const person = peopleByUid.get(uid);
  if (!person) {
    return uid;
  }
  return `${person.fullName} (${person.email})`;
};

const resolveDetailValue = (
  value: unknown,
  peopleByUid: Map<string, User>,
): string => {
  if (typeof value === "string") {
    return personLabel(value, peopleByUid);
  }
  if (Array.isArray(value)) {
    return value.map((item) => resolveDetailValue(item, peopleByUid)).join(", ");
  }
  if (value && typeof value === "object") {
    const resolved = Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        resolveDetailValue(entry, peopleByUid),
      ]),
    );
    return JSON.stringify(resolved);
  }
  return String(value);
};

const shouldShowDetail = (
  key: string,
  value: unknown,
  peopleByUid: Map<string, User>,
) => {
  if (!technicalIdKeys.has(key)) {
    return true;
  }
  return typeof value === "string" && peopleByUid.has(value);
};

const formatDetails = (
  details: Record<string, unknown>,
  peopleByUid: Map<string, User>,
) => {
  const entries = Object.entries(details).filter(([, value]) => {
    if (value === null || value === undefined || value === "") {
      return false;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return true;
  }).filter(([key, value]) => shouldShowDetail(key, value, peopleByUid));
  if (entries.length === 0) {
    return "No extra details";
  }
  return entries
    .slice(0, 4)
    .map(([key, value]) => {
      return `${key}: ${resolveDetailValue(value, peopleByUid)}`;
    })
    .join(" · ");
};

const targetLabel = (item: AuditLog, peopleByUid: Map<string, User>) => {
  const detailUid = ["uid", "memberUid", "memberId", "targetUid", "approvedUid"]
    .map((key) => item.details[key])
    .find((value): value is string => typeof value === "string" && peopleByUid.has(value));
  if (detailUid) {
    return `Member: ${personLabel(detailUid, peopleByUid)}`;
  }

  const [collection, id] = item.targetPath.split("/");
  const label = collectionLabels[collection] ?? collection;
  if (id && peopleByUid.has(id)) {
    return `${label}: ${personLabel(id, peopleByUid)}`;
  }
  return label ? `${label} record` : item.targetPath;
};

const AuditCard = ({
  item,
  peopleByUid,
}: {
  item: AuditLog;
  peopleByUid: Map<string, User>;
}) => (
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
    <Text style={styles.target}>{targetLabel(item, peopleByUid)}</Text>
    <Text style={styles.actor}>Actor: {personLabel(item.actorUid, peopleByUid)}</Text>
    <Text style={styles.details}>{formatDetails(item.details, peopleByUid)}</Text>
  </View>
);

const AuditLogsScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const admin = isAdmin(user);
  const { error, loading, logs } = useAuditLogs({ enabled: admin });
  const {
    loading: membersLoading,
    members,
  } = useMembers({ enabled: admin, source: "users" });
  const peopleByUid = useMemo(
    () => new Map(members.map((member) => [member.uid, member])),
    [members],
  );

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

  if (loading || membersLoading) {
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
        initialNumToRender={12}
        windowSize={7}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Production review trail</Text>
            <Text style={styles.noticeCopy}>
              Latest 100 organisation audit entries for admin review and incident
              response.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <AuditCard item={item} peopleByUid={peopleByUid} />
        )}
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
