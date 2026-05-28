import React from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Badge from "../../components/common/Badge";
import EmptyState from "../../components/common/EmptyState";
import GoldButton from "../../components/common/GoldButton";
import OutlineButton from "../../components/common/OutlineButton";
import ScreenHeader from "../../components/common/ScreenHeader";
import { useJoinRequests } from "../../hooks/useJoinRequests";
import { reviewJoinRequest } from "../../services/membersService";
import { useAuthStore } from "../../store/authStore";
import { colors, spacing, typography } from "../../theme";
import { JoinRequest } from "../../types/user";
import { formatRelativeTime } from "../../utils/formatDate";
import { safeGoBack } from "../../utils/navigation";
import { isAdmin } from "../../utils/roleGuard";

const statusColor = (status: JoinRequest["status"]) => {
  if (status === "approved") {
    return colors.status.success;
  }
  if (status === "declined") {
    return colors.status.error;
  }
  return colors.gold.default;
};

const JoinRequestsScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const admin = isAdmin(user);
  const { requests } = useJoinRequests({ enabled: admin });

  const handleReview = (
    request: JoinRequest,
    status: "approved" | "declined",
  ) => {
    const verb = status === "approved" ? "Approve" : "Decline";
    Alert.alert(`${verb} Request`, `${verb} ${request.fullName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: verb,
        style: status === "declined" ? "destructive" : "default",
        onPress: () =>
          reviewJoinRequest(request.id, status, user?.uid ?? "admin"),
      },
    ]);
  };

  if (!admin) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Join Requests"
          showBack
          onBack={() => safeGoBack(navigation, "DashboardHome")}
        />
        <EmptyState
          icon="!"
          title="Admin only"
          message="Only admins can review join requests."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Join Requests"
        showBack
        onBack={() => safeGoBack(navigation, "DashboardHome")}
      />
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.topRow}>
              <View style={styles.titleBlock}>
                <Text style={styles.name}>{item.fullName}</Text>
                <Text style={styles.meta}>
                  {formatRelativeTime(item.createdAt)}
                </Text>
              </View>
              <Badge
                label={item.status.toUpperCase()}
                color={statusColor(item.status)}
              />
            </View>
            <Text style={styles.contact}>
              {item.email} · {item.phone}
            </Text>
            <Text style={styles.message}>{item.message}</Text>
            {item.status === "pending" && (
              <View style={styles.actions}>
                <GoldButton
                  label="Approve"
                  onPress={() => handleReview(item, "approved")}
                />
                <OutlineButton
                  label="Decline"
                  color={colors.status.error}
                  onPress={() => handleReview(item, "declined")}
                />
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="!"
            title="No join requests"
            message="New requests from Login will appear here."
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  content: { padding: spacing.lg, gap: spacing.md },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  topRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  titleBlock: { flex: 1, gap: spacing.xs },
  name: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  meta: { fontSize: typography.size.xs, color: colors.text.tertiary },
  contact: { fontSize: typography.size.sm, color: colors.gold.light },
  message: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  actions: { gap: spacing.sm },
});

export default JoinRequestsScreen;
