import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Badge from "../../components/common/Badge";
import EmptyState from "../../components/common/EmptyState";
import FeedbackModal, {
  FeedbackModalType,
} from "../../components/common/FeedbackModal";
import GoldButton from "../../components/common/GoldButton";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import OutlineButton from "../../components/common/OutlineButton";
import ScreenHeader from "../../components/common/ScreenHeader";
import { useContributions } from "../../hooks/useContributions";
import { useMembers } from "../../hooks/useMembers";
import {
  recordContributionPayout,
  reviewContributionWithdrawal,
} from "../../services/contributionsService";
import { useAuthStore } from "../../store/authStore";
import { colors, spacing, typography } from "../../theme";
import { ContributionWithdrawRequest } from "../../types/contributions";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDisplayDate } from "../../utils/formatDate";
import { safeGoBack } from "../../utils/navigation";
import { isAdmin } from "../../utils/roleGuard";

const statusColor = (status: ContributionWithdrawRequest["status"]) => {
  switch (status) {
    case "pending":
      return colors.gold.default;
    case "approved":
      return colors.status.info;
    case "rejected":
      return colors.status.error;
    case "paid":
      return colors.status.success;
    default:
      return colors.text.secondary;
  }
};

const WithdrawRequestsScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const admin = isAdmin(user);
  const {
    withdrawRequests,
    error,
    loading,
  } = useContributions(undefined, admin);
  const { members } = useMembers({ enabled: admin });
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [actingId, setActingId] = useState<string | null>(null);
  const [payoutRequestId, setPayoutRequestId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("Bank transfer");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [modal, setModal] = useState<{
    visible: boolean;
    type: FeedbackModalType;
    title: string;
    message: string;
    onPrimary: () => void;
  } | null>(null);
  const closeModal = () => setModal(null);

  const sorted = useMemo(() => {
    const list = [...withdrawRequests].sort(
      (a, b) =>
        (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
    );
    if (filter === "open") {
      return list.filter(
        (request) =>
          request.status === "pending" || request.status === "approved",
      );
    }
    return list;
  }, [filter, withdrawRequests]);

  const memberName = (uid: string, fallback?: string) =>
    members.find((member) => member.uid === uid)?.fullName ??
    fallback ??
    "Member";

  const handleReview = async (
    requestId: string,
    decision: "approve" | "reject",
  ) => {
    if (actingId) {
      return;
    }
    try {
      setActingId(requestId);
      await reviewContributionWithdrawal(requestId, decision);
    } catch (reviewError) {
      setModal({
        visible: true,
        type: "error",
        title: "Review failed",
        message:
          reviewError instanceof Error
            ? reviewError.message
            : "Please try again.",
        onPrimary: closeModal,
      });
    } finally {
      setActingId(null);
    }
  };

  const handlePayout = async () => {
    if (!payoutRequestId || actingId) {
      return;
    }
    if (!paymentMethod.trim()) {
      setModal({
        visible: true,
        type: "error",
        title: "Payment method required",
        message: "Enter how the payout was sent.",
        onPrimary: closeModal,
      });
      return;
    }
    try {
      setActingId(payoutRequestId);
      await recordContributionPayout({
        requestId: payoutRequestId,
        paymentMethod: paymentMethod.trim(),
        reference: reference.trim(),
        note: note.trim(),
      });
      setPayoutRequestId(null);
      setReference("");
      setNote("");
      setModal({
        visible: true,
        type: "success",
        title: "Payout recorded",
        message: "The withdrawal has been marked as paid.",
        onPrimary: closeModal,
      });
    } catch (payoutError) {
      setModal({
        visible: true,
        type: "error",
        title: "Payout not recorded",
        message:
          payoutError instanceof Error
            ? payoutError.message
            : "Please try again.",
        onPrimary: closeModal,
      });
    } finally {
      setActingId(null);
    }
  };

  if (!admin) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Withdraw Requests"
          showBack
          onBack={() => safeGoBack(navigation, "FinanceAdmin")}
        />
        <EmptyState
          icon="!"
          title="Admin only"
          message="Only admins can review withdrawal requests."
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
          title="Withdraw Requests"
          showBack
          onBack={() => safeGoBack(navigation, "FinanceAdmin")}
        />
        <EmptyState icon="!" title="Unavailable" message={error} />
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
          onPrimary={modal.onPrimary}
        />
      )}
      <ScreenHeader
        title="Withdraw Requests"
        showBack
        onBack={() => safeGoBack(navigation, "FinanceAdmin")}
      />
      <View style={styles.filterRow}>
        {(["open", "all"] as const).map((item) => {
          const active = filter === item;
          return (
            <TouchableOpacity
              key={item}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(item)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.filterChipText,
                  active && styles.filterChipTextActive,
                ]}
              >
                {item === "open" ? "Open" : "All"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListEmptyComponent={
          <EmptyState
            icon="✅"
            title={filter === "open" ? "No open requests" : "No requests"}
            message={
              filter === "open"
                ? "New member withdrawal requests will appear here."
                : "Withdrawal history will appear here."
            }
          />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardCopy}>
                <Text style={styles.name}>
                  {memberName(item.uid, item.memberName)}
                </Text>
                <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
                <Text style={styles.meta}>
                  {item.createdAt
                    ? formatDisplayDate(item.createdAt)
                    : "No date"}
                </Text>
                {item.reason ? (
                  <Text style={styles.reason}>{item.reason}</Text>
                ) : null}
                {item.reviewNote ? (
                  <Text style={styles.reason}>Note: {item.reviewNote}</Text>
                ) : null}
              </View>
              <Badge
                label={item.status.toUpperCase()}
                color={statusColor(item.status)}
              />
            </View>
            {item.status === "pending" ? (
              <View style={styles.actions}>
                <GoldButton
                  label="Approve"
                  onPress={() => handleReview(item.id, "approve")}
                  loading={actingId === item.id}
                />
                <OutlineButton
                  label="Reject"
                  onPress={() =>
                    Alert.alert(
                      "Reject request",
                      "Reject this withdrawal request?",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Reject",
                          style: "destructive",
                          onPress: () => handleReview(item.id, "reject"),
                        },
                      ],
                    )
                  }
                />
              </View>
            ) : null}
            {item.status === "approved" ? (
              payoutRequestId === item.id ? (
                <View style={styles.payoutForm}>
                  <Text style={styles.label}>PAYMENT METHOD</Text>
                  <TextInput
                    value={paymentMethod}
                    onChangeText={setPaymentMethod}
                    style={styles.input}
                    placeholderTextColor={colors.text.tertiary}
                  />
                  <Text style={styles.label}>REFERENCE (OPTIONAL)</Text>
                  <TextInput
                    value={reference}
                    onChangeText={setReference}
                    style={styles.input}
                    placeholderTextColor={colors.text.tertiary}
                  />
                  <Text style={styles.label}>NOTE (OPTIONAL)</Text>
                  <TextInput
                    value={note}
                    onChangeText={setNote}
                    style={styles.input}
                    placeholderTextColor={colors.text.tertiary}
                  />
                  <GoldButton
                    label="Confirm Payout"
                    onPress={handlePayout}
                    loading={actingId === item.id}
                    fullWidth
                  />
                  <OutlineButton
                    label="Cancel"
                    onPress={() => setPayoutRequestId(null)}
                    fullWidth
                  />
                </View>
              ) : (
                <GoldButton
                  label="Record Payout"
                  onPress={() => setPayoutRequestId(item.id)}
                  fullWidth
                />
              )
            ) : null}
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  filterChip: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  filterChipActive: { borderColor: colors.gold.default },
  filterChipText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontWeight: typography.weight.semibold,
  },
  filterChipTextActive: { color: colors.gold.light },
  content: { padding: spacing.lg, gap: spacing.md },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  cardCopy: { flex: 1, gap: spacing.xs },
  name: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  amount: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
  },
  meta: { fontSize: typography.size.sm, color: colors.text.secondary },
  reason: { fontSize: typography.size.sm, color: colors.text.secondary },
  actions: { gap: spacing.sm },
  payoutForm: { gap: spacing.sm },
  label: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  input: {
    minHeight: 48,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.tertiary,
    color: colors.text.primary,
  },
});

export default WithdrawRequestsScreen;
