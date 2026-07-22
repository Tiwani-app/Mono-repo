import React, { useState } from "react";
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
import CalendarDateField from "../../components/common/CalendarDateField";
import EmptyState from "../../components/common/EmptyState";
import FeedbackModal, {
  FeedbackModalType,
} from "../../components/common/FeedbackModal";
import GoldButton from "../../components/common/GoldButton";
import ScreenHeader from "../../components/common/ScreenHeader";
import { createContributionPool } from "../../services/contributionsService";
import { useAuthStore } from "../../store/authStore";
import { colors, spacing, typography } from "../../theme";
import { safeGoBack } from "../../utils/navigation";
import { isAdmin } from "../../utils/roleGuard";

interface FormValues {
  name: string;
  expectedAmount: string;
  endDate: string;
  note: string;
}

const parseDate = (value: string) => {
  if (!value.trim()) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return null;
  }
  const parsed = new Date(`${value.trim()}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const ContributionPoolFormScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
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
    defaultValues: {
      name: "",
      expectedAmount: "",
      endDate: "",
      note: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (submitting) {
      return;
    }
    const endDate = values.endDate.trim()
      ? parseDate(values.endDate)
      : null;
    if (values.endDate.trim() && !endDate) {
      setModal({
        visible: true,
        type: "error",
        title: "End date invalid",
        message: "Use date format YYYY-MM-DD or leave blank.",
        onPrimary: closeModal,
      });
      return;
    }
    const expectedAmount = values.expectedAmount.trim()
      ? Number(values.expectedAmount.replace(/,/g, ""))
      : 0;
    if (
      values.expectedAmount.trim() &&
      (!Number.isFinite(expectedAmount) || expectedAmount <= 0)
    ) {
      setModal({
        visible: true,
        type: "error",
        title: "Amount invalid",
        message: "Expected amount must be greater than zero, or leave blank.",
        onPrimary: closeModal,
      });
      return;
    }

    try {
      setSubmitting(true);
      await createContributionPool({
        name: values.name.trim(),
        expectedAmount,
        endDate,
        note: values.note.trim(),
      });
      safeGoBack(navigation, "FinanceAdmin");
    } catch (error) {
      setModal({
        visible: true,
        type: "error",
        title: "Pool not created",
        message:
          error instanceof Error ? error.message : "Please try again.",
        onPrimary: closeModal,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdmin(user)) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="New Pool"
          showBack
          onBack={() => safeGoBack(navigation, "FinanceAdmin")}
        />
        <EmptyState
          icon="!"
          title="Admin only"
          message="Only admins can create contribution pools."
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
        title="New Contribution Pool"
        showBack
        onBack={() => safeGoBack(navigation, "FinanceAdmin")}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Field
            control={control}
            error={formState.errors.name?.message}
            label="POOL NAME"
            name="name"
            rules={{ required: "Name is required." }}
          />
          <Field
            control={control}
            error={formState.errors.expectedAmount?.message}
            keyboardType="numeric"
            label="EXPECTED AMOUNT (OPTIONAL)"
            name="expectedAmount"
            rules={{
              pattern: {
                value: /^$|^[0-9,]+$/,
                message: "Use numbers only.",
              },
            }}
          />
          <Controller
            control={control}
            name="endDate"
            rules={{
              pattern: {
                value: /^$|^\d{4}-\d{2}-\d{2}$/,
                message: "Use YYYY-MM-DD.",
              },
            }}
            render={({ field: { onChange, value } }) => (
              <CalendarDateField
                value={value}
                onChange={onChange}
                label="END DATE (OPTIONAL)"
                error={formState.errors.endDate?.message}
              />
            )}
          />
          <Field
            control={control}
            error={formState.errors.note?.message}
            label="NOTE (OPTIONAL)"
            name="note"
          />
          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>How this works</Text>
            <Text style={styles.noteText}>
              Creating a pool does not charge members. Admins record
              contributions as people pay in, and members can request
              withdrawals from their available balance.
            </Text>
          </View>
          <GoldButton
            label="Create Pool"
            onPress={handleSubmit(onSubmit)}
            loading={submitting}
            fullWidth
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const Field = ({ control, error, keyboardType, label, name, rules }: any) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { onBlur, onChange, value } }) => (
        <TextInput
          value={value}
          onBlur={onBlur}
          onChangeText={onChange}
          keyboardType={keyboardType}
          placeholderTextColor={colors.text.tertiary}
          style={[styles.input, error && styles.inputError]}
        />
      )}
    />
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
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
  inputError: { borderColor: colors.status.error },
  errorText: { fontSize: typography.size.xs, color: colors.status.error },
  noteCard: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  noteTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  noteText: { fontSize: typography.size.sm, color: colors.text.secondary },
});

export default ContributionPoolFormScreen;
