import React, { useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Badge from "../../components/common/Badge";
import EmptyState from "../../components/common/EmptyState";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import OutlineButton from "../../components/common/OutlineButton";
import ScreenHeader from "../../components/common/ScreenHeader";
import { useAccountDeletionRequests } from "../../hooks/useAccountDeletionRequests";
import {
  completeAccountDeletion,
  declineAccountDeletion,
} from "../../services/membersService";
import { useAuthStore } from "../../store/authStore";
import { colors, spacing, typography } from "../../theme";
import {
  AccountDeletionRequest,
  AccountDeletionRequestStatus,
} from "../../types/user";
import {
  formatDisplayDate,
  formatRelativeTime,
} from "../../utils/formatDate";
import { safeGoBack } from "../../utils/navigation";
import { isAdmin } from "../../utils/roleGuard";

const statusColor = (status: AccountDeletionRequestStatus) => {
  if (status === "completed") {
    return colors.status.success;
  }
  if (status === "declined") {
    return colors.status.error;
  }
  return colors.gold.default;
};

const statusLabel = (status: AccountDeletionRequestStatus) =>
  status === "requested" ? "PENDING" : status.toUpperCase();

const reviewDate = (request: AccountDeletionRequest) => {
  const date =
    request.completedAt ?? request.declinedAt ?? request.reviewedAt ?? null;
  return date ? formatDisplayDate(date) : null;
};

const AccountDeletionRequestsScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const admin = isAdmin(user);
  const { error, loading, requests } = useAccountDeletionRequests({
    enabled: admin,
  });
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const handleComplete = (request: AccountDeletionRequest) => {
    Alert.alert(
      "Complete deletion?",
      `This will delete the Firebase Auth account for ${request.fullName}, remove their member profile from the app, and remove their device tokens. Finance, governance, and audit records are preserved where required. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete Deletion",
          style: "destructive",
          onPress: async () => {
            try {
              setReviewingId(request.requestId);
              const result = await completeAccountDeletion(request.requestId);
              Alert.alert(
                "Deletion completed",
                result.authDeleted
                  ? "The account was deleted and the member profile was removed from the app."
                  : "The Auth account was already gone. The member profile was removed from the app.",
              );
            } catch (reviewError) {
              Alert.alert(
                "Deletion not completed",
                reviewError instanceof Error
                  ? reviewError.message
                  : "Please try again.",
              );
            } finally {
              setReviewingId(null);
            }
          },
        },
      ],
    );
  };

  const handleDecline = (request: AccountDeletionRequest) => {
    Alert.alert(
      "Decline deletion request?",
      `Keep ${request.fullName}'s account active and close this deletion request?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline Request",
          onPress: async () => {
            try {
              setReviewingId(request.requestId);
              await declineAccountDeletion(request.requestId);
              Alert.alert("Request declined", "The account remains active.");
            } catch (reviewError) {
              Alert.alert(
                "Request not declined",
                reviewError instanceof Error
                  ? reviewError.message
                  : "Please try again.",
              );
            } finally {
              setReviewingId(null);
            }
          },
        },
      ],
    );
  };

  if (!admin) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Deletion Requests"
          showBack
          onBack={() => safeGoBack(navigation, "DashboardHome")}
        />
        <EmptyState
          icon="!"
          title="Admin only"
          message="Only admins can review account deletion requests."
        />
      </SafeAreaView>
    );
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Deletion Requests"
          showBack
          onBack={() => safeGoBack(navigation, "DashboardHome")}
        />
        <EmptyState
          icon="!"
          title="Deletion requests unavailable"
          message={error}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Deletion Requests"
        showBack
        onBack={() => safeGoBack(navigation, "DashboardHome")}
      />
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Account deletion review</Text>
            <Text style={styles.infoText}>
              Review member requests before deleting Auth accounts or
              anonymising profile data. Finance, governance, and audit records
              are preserved where required.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="!"
            title="No deletion requests"
            message="Pending account deletion requests will appear here."
          />
        }
        renderItem={({ item }) => {
          const reviewedDate = reviewDate(item);
          const reviewer = item.reviewedByName?.trim() || item.reviewedByEmail?.trim() || null;
          const isReviewing = reviewingId === item.requestId;
          return (
            <View style={styles.card}>
              <View style={styles.topRow}>
                <View style={styles.titleBlock}>
                  <Text style={styles.name}>{item.fullName}</Text>
                  <Text style={styles.meta}>{item.email}</Text>
                </View>
                <Badge label={statusLabel(item.status)} color={statusColor(item.status)} />
              </View>
              <Text style={styles.requested}>
                Requested {formatRelativeTime(item.requestedAt)}
              </Text>
              <View style={styles.reasonBox}>
                <Text style={styles.reasonLabel}>Reason</Text>
                <Text style={styles.reason}>
                  {item.reason || "No reason provided."}
                </Text>
              </View>
              {reviewedDate ? (
                <Text style={styles.reviewed}>
                  Reviewed {reviewedDate}
                  {reviewer ? ` by ${reviewer}` : ""}
                </Text>
              ) : null}
              {item.status === "requested" ? (
                <View style={styles.actions}>
                  <OutlineButton
                    label="Complete Deletion"
                    color={colors.status.error}
                    onPress={() => handleComplete(item)}
                    disabled={Boolean(reviewingId)}
                    fullWidth
                  />
                  <OutlineButton
                    label="Decline Request"
                    onPress={() => handleDecline(item)}
                    disabled={Boolean(reviewingId) || isReviewing}
                    fullWidth
                  />
                </View>
              ) : null}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  content: { padding: spacing.lg, gap: spacing.md },
  infoCard: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  infoTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  infoText: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    lineHeight: 22,
  },
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
  meta: { fontSize: typography.size.sm, color: colors.gold.light },
  requested: { fontSize: typography.size.sm, color: colors.text.tertiary },
  reasonBox: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.bg.elevated,
  },
  reasonLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.text.secondary,
    letterSpacing: 0.8,
  },
  reason: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  reviewed: { fontSize: typography.size.sm, color: colors.text.tertiary },
  actions: { gap: spacing.sm },
});

export default AccountDeletionRequestsScreen;
