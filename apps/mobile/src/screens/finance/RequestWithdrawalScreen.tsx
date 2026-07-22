import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Controller, useForm } from "react-hook-form";
import { SafeAreaView } from "react-native-safe-area-context";
import EmptyState from "../../components/common/EmptyState";
import FeedbackModal, {
  FeedbackModalType,
} from "../../components/common/FeedbackModal";
import GoldButton from "../../components/common/GoldButton";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ScreenHeader from "../../components/common/ScreenHeader";
import { useContributions } from "../../hooks/useContributions";
import { requestContributionWithdrawal } from "../../services/contributionsService";
import { useAuthStore } from "../../store/authStore";
import { colors, spacing, typography } from "../../theme";
import { getMemberContributionAvailable } from "../../utils/contributionTotals";
import { formatCurrency } from "../../utils/formatCurrency";
import { safeGoBack } from "../../utils/navigation";

interface FormValues {
  amount: string;
  reason: string;
}

const RequestWithdrawalScreen = ({ navigation, route }: any) => {
  const poolIdParam = route.params?.poolId as string | undefined;
  const { user } = useAuthStore();
  const {
    activePool,
    entries,
    error,
    loading,
    pools,
    withdrawRequests,
  } = useContributions(user?.uid);
  const pool =
    pools.find((item) => item.id === poolIdParam) ?? activePool ?? null;
  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState<{
    visible: boolean;
    type: FeedbackModalType;
    title: string;
    message: string;
    onPrimary: () => void;
  } | null>(null);
  const closeModal = () => setModal(null);
  const { control, handleSubmit, formState } = useForm<FormValues>({
    defaultValues: { amount: "", reason: "" },
  });

  const available = useMemo(
    () =>
      user
        ? getMemberContributionAvailable(
            entries,
            withdrawRequests,
            user.uid,
            pool?.id,
          )
        : 0,
    [entries, pool?.id, user, withdrawRequests],
  );

  const onSubmit = async (values: FormValues) => {
    if (submitting || !pool) {
      return;
    }
    const amount = Number(values.amount.replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      setModal({
        visible: true,
        type: "error",
        title: "Amount required",
        message: "Enter an amount greater than zero.",
        onPrimary: closeModal,
      });
      return;
    }
    if (amount > available) {
      setModal({
        visible: true,
        type: "error",
        title: "Amount too high",
        message: `You can request up to ${formatCurrency(available)}.`,
        onPrimary: closeModal,
      });
      return;
    }

    try {
      setSubmitting(true);
      await requestContributionWithdrawal({
        amount,
        reason: values.reason.trim(),
        poolId: pool.id,
      });
      setModal({
        visible: true,
        type: "success",
        title: "Request submitted",
        message: "An admin will review your withdrawal request.",
        onPrimary: () => {
          closeModal();
          safeGoBack(navigation, "MyContributions");
        },
      });
    } catch (submitError) {
      setModal({
        visible: true,
        type: "error",
        title: "Request not submitted",
        message:
          submitError instanceof Error
            ? submitError.message
            : "Please try again.",
        onPrimary: closeModal,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Request Withdrawal"
          showBack
          onBack={() => safeGoBack(navigation, "MyContributions")}
        />
        <EmptyState icon="!" title="Unavailable" message={error} />
      </SafeAreaView>
    );
  }

  if (!pool || pool.status !== "active") {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Request Withdrawal"
          showBack
          onBack={() => safeGoBack(navigation, "MyContributions")}
        />
        <EmptyState
          icon="!"
          title="No active pool"
          message="Withdrawals are only available while a contribution pool is open."
        />
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
        title="Request Withdrawal"
        showBack
        onBack={() => safeGoBack(navigation, "MyContributions")}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.banner}>
            <Text style={styles.bannerLabel}>AVAILABLE TO WITHDRAW</Text>
            <Text style={styles.bannerAmount}>{formatCurrency(available)}</Text>
            <Text style={styles.bannerMeta}>{pool.name}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>AMOUNT</Text>
            <Controller
              control={control}
              name="amount"
              rules={{
                required: "Amount is required.",
                pattern: { value: /^[0-9,]+$/, message: "Use numbers only." },
              }}
              render={({ field: { onBlur, onChange, value } }) => (
                <TextInput
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  keyboardType="numeric"
                  placeholderTextColor={colors.text.tertiary}
                  style={[
                    styles.input,
                    formState.errors.amount && styles.inputError,
                  ]}
                />
              )}
            />
            {formState.errors.amount && (
              <Text style={styles.errorText}>
                {formState.errors.amount.message}
              </Text>
            )}
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>REASON (OPTIONAL)</Text>
            <Controller
              control={control}
              name="reason"
              render={({ field: { onBlur, onChange, value } }) => (
                <TextInput
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  multiline
                  placeholderTextColor={colors.text.tertiary}
                  style={[styles.input, styles.multiline]}
                />
              )}
            />
          </View>
          <GoldButton
            label="Submit Request"
            onPress={handleSubmit(onSubmit)}
            loading={submitting}
            disabled={available <= 0}
            fullWidth
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  banner: {
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  bannerLabel: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  bannerAmount: {
    fontSize: typography.size.xxxl,
    fontWeight: typography.weight.black,
    color: colors.gold.light,
  },
  bannerMeta: { fontSize: typography.size.sm, color: colors.text.secondary },
  field: { gap: spacing.xs },
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
  multiline: { minHeight: 96, textAlignVertical: "top" },
  inputError: { borderColor: colors.status.error },
  errorText: { fontSize: typography.size.xs, color: colors.status.error },
});

export default RequestWithdrawalScreen;
