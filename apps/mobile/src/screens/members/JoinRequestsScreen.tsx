import React, { useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Badge from "../../components/common/Badge";
import EmptyState from "../../components/common/EmptyState";
import FeedbackModal, { FeedbackModalType } from "../../components/common/FeedbackModal";
import GoldButton from "../../components/common/GoldButton";
import LoadingSpinner from "../../components/common/LoadingSpinner";
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
import type { SetupDeliveryResult } from "../../services/cloudFunctionsService";

type RequestFilter = "all" | "pending" | "previous";

const requestFilters: { label: string; value: RequestFilter }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Previous", value: "previous" },
];

const matchesRequestFilter = (request: JoinRequest, filter: RequestFilter) => {
  if (filter === "all") {
    return true;
  }
  if (filter === "pending") {
    return request.status === "pending";
  }
  return request.status !== "pending";
};

const statusColor = (status: JoinRequest["status"]) => {
  if (status === "approved") {
    return colors.status.success;
  }
  if (status === "declined") {
    return colors.status.error;
  }
  return colors.gold.default;
};

const setupDeliveryMessage = (delivery: SetupDeliveryResult | null) => {
  if (!delivery) {
    return null;
  }
  if (delivery.setupEmailSent) {
    return "The member account was created and the setup email was sent.";
  }
  return [
    "The member account was created, but the setup email was not sent.",
    delivery.setupEmailError ? `Reason: ${delivery.setupEmailError}` : null,
    delivery.setupLink ? `Setup link: ${delivery.setupLink}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
};

const JoinRequestsScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const admin = isAdmin(user);
  const { error, loading, requests } = useJoinRequests({ enabled: admin });
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<RequestFilter>("all");
  const [modal, setModal] = useState<{
    visible: boolean;
    type: FeedbackModalType;
    title: string;
    message: string;
    primaryLabel?: string;
    onPrimary: () => void;
    secondaryLabel?: string;
    onSecondary?: () => void;
  } | null>(null);
  const closeModal = () => setModal(null);
  const filteredRequests = requests.filter((request) =>
    matchesRequestFilter(request, filter),
  );

  const handleReview = (
    request: JoinRequest,
    status: "approved" | "declined",
  ) => {
    const verb = status === "approved" ? "Approve" : "Decline";
    setModal({
      visible: true,
      type: "warning",
      title: `${verb} Request`,
      message: `${verb} ${request.fullName}?`,
      secondaryLabel: "Cancel",
      onSecondary: closeModal,
      primaryLabel: verb,
      onPrimary: async () => {
        closeModal();
        try {
          setReviewingId(request.id);
          const delivery = await reviewJoinRequest(
            request.id,
            status,
            user?.uid ?? "admin",
          );
          const message = setupDeliveryMessage(delivery);
          if (message) {
            setModal({ visible: true, type: "success", title: "Request approved", message, onPrimary: closeModal });
          }
        } catch (reviewError) {
          setModal({
            visible: true,
            type: "error",
            title: "Request not updated",
            message: reviewError instanceof Error ? reviewError.message : "Please try again.",
            onPrimary: closeModal,
          });
        } finally {
          setReviewingId(null);
        }
      },
    });
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

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Join Requests"
          showBack
          onBack={() => safeGoBack(navigation, "DashboardHome")}
        />
        <EmptyState icon="!" title="Join requests unavailable" message={error} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {modal && (
        <FeedbackModal
          visible={modal.visible}
          type={modal.type}
          title={modal.title}
          message={modal.message}
          primaryLabel={modal.primaryLabel}
          onPrimary={modal.onPrimary}
          secondaryLabel={modal.secondaryLabel}
          onSecondary={modal.onSecondary}
        />
      )}
      <ScreenHeader
        title="Join Requests"
        showBack
        onBack={() => safeGoBack(navigation, "DashboardHome")}
      />
      <FlatList
        data={filteredRequests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.filterRow}>
            {requestFilters.map((option) => {
              const selected = filter === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterChip,
                    selected && styles.selectedFilterChip,
                  ]}
                  onPress={() => setFilter(option.value)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterText,
                      selected && styles.selectedFilterText,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        }
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
                  loading={reviewingId === item.id}
                />
                <OutlineButton
                  label="Decline"
                  color={colors.status.error}
                  onPress={() => handleReview(item, "declined")}
                  disabled={reviewingId === item.id}
                />
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="!"
            title="No join requests"
            message={
              filter === "pending"
                ? "There are no pending requests to review."
                : filter === "previous"
                  ? "Approved and declined requests will appear here."
                  : "New requests from Login will appear here."
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
});

export default JoinRequestsScreen;
