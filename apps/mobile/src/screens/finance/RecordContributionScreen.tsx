import React, { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Controller, useForm } from "react-hook-form";
import { SafeAreaView } from "react-native-safe-area-context";
import Avatar from "../../components/common/Avatar";
import EmptyState from "../../components/common/EmptyState";
import FeedbackModal, {
  FeedbackModalType,
} from "../../components/common/FeedbackModal";
import GoldButton from "../../components/common/GoldButton";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ScreenHeader from "../../components/common/ScreenHeader";
import { useContributions } from "../../hooks/useContributions";
import { useMembers } from "../../hooks/useMembers";
import {
  recordBulkContributions,
  recordContribution,
} from "../../services/contributionsService";
import { useAuthStore } from "../../store/authStore";
import { colors, spacing, typography } from "../../theme";
import { User } from "../../types/user";
import { formatCurrency } from "../../utils/formatCurrency";
import { getInitials } from "../../utils/getInitials";
import { safeGoBack } from "../../utils/navigation";
import { isAdmin } from "../../utils/roleGuard";

interface FormValues {
  amount: string;
  paymentMethod: string;
  reference: string;
  note: string;
}

type RecordMode = "single" | "bulk";

const searchableMemberText = (member: User) =>
  `${member.fullName} ${member.email} ${member.phone}`.toLowerCase();

const RecordContributionScreen = ({ navigation, route }: any) => {
  const routeMemberId = route.params?.memberId as string | undefined;
  const { user } = useAuthStore();
  const admin = isAdmin(user);
  const { activePool, loading: poolsLoading } = useContributions(
    undefined,
    admin,
  );
  const { members, error, loading } = useMembers({ enabled: admin });
  const [mode, setMode] = useState<RecordMode>("single");
  const [memberQuery, setMemberQuery] = useState("");
  const [selectedUid, setSelectedUid] = useState(routeMemberId ?? "");
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
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
      amount: "",
      paymentMethod: "Bank transfer",
      reference: "",
      note: "",
    },
  });

  useEffect(() => {
    if (mode === "bulk") {
      setSelectedUid("");
    } else {
      setSelectedUids([]);
    }
  }, [mode]);

  const filteredMembers = useMemo(() => {
    const query = memberQuery.trim().toLowerCase();
    return members.filter(
      (member) => !query || searchableMemberText(member).includes(query),
    );
  }, [memberQuery, members]);

  const onSubmit = async (values: FormValues) => {
    if (submitting) {
      return;
    }
    if (!activePool) {
      setModal({
        visible: true,
        type: "error",
        title: "No active pool",
        message: "Create a contribution pool first.",
        onPrimary: closeModal,
      });
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

    try {
      setSubmitting(true);
      if (mode === "bulk") {
        if (selectedUids.length === 0) {
          setModal({
            visible: true,
            type: "error",
            title: "Select members",
            message: "Choose at least one member for bulk recording.",
            onPrimary: closeModal,
          });
          return;
        }
        const count = await recordBulkContributions({
          memberIds: selectedUids,
          amount,
          paymentMethod: values.paymentMethod.trim(),
          reference: values.reference.trim(),
          note: values.note.trim(),
          poolId: activePool.id,
        });
        setModal({
          visible: true,
          type: "success",
          title: "Contributions recorded",
          message: `Recorded ${formatCurrency(amount)} for ${count} member${count === 1 ? "" : "s"}.`,
          onPrimary: () => {
            closeModal();
            safeGoBack(navigation, "FinanceAdmin");
          },
        });
        return;
      }

      if (!selectedUid) {
        setModal({
          visible: true,
          type: "error",
          title: "Select a member",
          message: "Choose the member who contributed.",
          onPrimary: closeModal,
        });
        return;
      }
      await recordContribution({
        memberId: selectedUid,
        amount,
        paymentMethod: values.paymentMethod.trim(),
        reference: values.reference.trim(),
        note: values.note.trim(),
        poolId: activePool.id,
      });
      safeGoBack(navigation, "FinanceAdmin");
    } catch (submitError) {
      setModal({
        visible: true,
        type: "error",
        title: "Contribution not recorded",
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

  if (!admin) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Record Contribution"
          showBack
          onBack={() => safeGoBack(navigation, "FinanceAdmin")}
        />
        <EmptyState
          icon="!"
          title="Admin only"
          message="Only admins can record contributions."
        />
      </SafeAreaView>
    );
  }

  if (loading || poolsLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Record Contribution"
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
        title="Record Contribution"
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
          {activePool ? (
            <View style={styles.poolCard}>
              <Text style={styles.poolLabel}>RECORDING INTO POOL</Text>
              <Text style={styles.poolName}>{activePool.name}</Text>
            </View>
          ) : (
            <EmptyState
              icon="!"
              title="No active pool"
              message="Create a contribution pool before recording."
            />
          )}
          <View style={styles.modeRow}>
            {(["single", "bulk"] as RecordMode[]).map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.modeChip, mode === item && styles.modeChipActive]}
                onPress={() => setMode(item)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.modeChipText,
                    mode === item && styles.modeChipTextActive,
                  ]}
                >
                  {item === "single" ? "Single" : "Bulk"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.sectionLabel}>
            {mode === "bulk" ? "SELECT MEMBERS" : "MEMBER"}
          </Text>
          <TextInput
            value={memberQuery}
            onChangeText={setMemberQuery}
            placeholder="Search member name, email, or phone"
            placeholderTextColor={colors.text.tertiary}
            style={styles.search}
            autoCorrect={false}
            autoCapitalize="none"
          />
          <View style={styles.memberList}>
            {filteredMembers.length === 0 ? (
              <View style={styles.noticeCard}>
                <Text style={styles.noticeText}>
                  No members match this search.
                </Text>
              </View>
            ) : (
              filteredMembers.map((member) => {
                if (mode === "bulk") {
                  const checked = selectedUids.includes(member.uid);
                  return (
                    <TouchableOpacity
                      key={member.uid}
                      style={[
                        styles.memberRow,
                        checked && styles.memberSelected,
                      ]}
                      onPress={() =>
                        setSelectedUids((prev) =>
                          prev.includes(member.uid)
                            ? prev.filter((id) => id !== member.uid)
                            : [...prev, member.uid],
                        )
                      }
                      activeOpacity={0.8}
                    >
                      <Avatar
                        initials={getInitials(member.fullName)}
                        photoURL={member.photoURL}
                        size={38}
                      />
                      <View style={styles.memberContent}>
                        <Text style={styles.memberName}>{member.fullName}</Text>
                        <Text style={styles.memberMeta}>{member.email}</Text>
                      </View>
                      <View
                        style={[
                          styles.checkbox,
                          checked && styles.checkboxChecked,
                        ]}
                      >
                        {checked ? (
                          <Text style={styles.checkmark}>✓</Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                }

                const selected = selectedUid === member.uid;
                return (
                  <TouchableOpacity
                    key={member.uid}
                    style={[
                      styles.memberRow,
                      selected && styles.memberSelected,
                    ]}
                    onPress={() => setSelectedUid(member.uid)}
                    activeOpacity={0.8}
                  >
                    <Avatar
                      initials={getInitials(member.fullName)}
                      photoURL={member.photoURL}
                      size={38}
                    />
                    <View style={styles.memberContent}>
                      <Text style={styles.memberName}>{member.fullName}</Text>
                      <Text style={styles.memberMeta}>{member.email}</Text>
                    </View>
                    <View
                      style={[styles.radio, selected && styles.radioSelected]}
                    />
                  </TouchableOpacity>
                );
              })
            )}
          </View>
          <Text style={styles.sectionLabel}>CONTRIBUTION DETAILS</Text>
          <Field
            control={control}
            error={formState.errors.amount?.message}
            keyboardType="numeric"
            label="AMOUNT"
            name="amount"
            rules={{
              required: "Amount is required.",
              pattern: { value: /^[0-9,]+$/, message: "Use numbers only." },
            }}
          />
          <Field
            control={control}
            error={formState.errors.paymentMethod?.message}
            label="PAYMENT METHOD"
            name="paymentMethod"
            rules={{ required: "Payment method is required." }}
          />
          <Field
            control={control}
            error={formState.errors.reference?.message}
            label="REFERENCE (OPTIONAL)"
            name="reference"
          />
          <Field
            control={control}
            error={formState.errors.note?.message}
            label="NOTE (OPTIONAL)"
            name="note"
          />
          <GoldButton
            label={
              mode === "bulk"
                ? "Record Bulk Contributions"
                : "Record Contribution"
            }
            onPress={handleSubmit(onSubmit)}
            loading={submitting}
            disabled={!activePool}
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
  poolCard: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gold.default,
    backgroundColor: colors.bg.card,
  },
  poolLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.text.secondary,
    letterSpacing: 0.8,
  },
  poolName: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.black,
    color: colors.gold.light,
  },
  modeRow: { flexDirection: "row", gap: spacing.sm },
  modeChip: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  modeChipActive: { borderColor: colors.gold.default },
  modeChipText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontWeight: typography.weight.semibold,
  },
  modeChipTextActive: { color: colors.gold.light },
  sectionLabel: {
    marginTop: spacing.sm,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.text.secondary,
    letterSpacing: 0.8,
  },
  search: {
    minHeight: 48,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.tertiary,
    color: colors.text.primary,
  },
  memberList: { gap: spacing.sm },
  noticeCard: {
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  noticeText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  memberRow: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  memberSelected: {
    borderColor: colors.gold.default,
    backgroundColor: `${colors.gold.default}12`,
  },
  memberContent: { flex: 1, gap: spacing.xs },
  memberName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  memberMeta: { fontSize: typography.size.sm, color: colors.text.secondary },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.text.tertiary,
  },
  radioSelected: {
    borderColor: colors.gold.default,
    backgroundColor: colors.gold.default,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.text.tertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    borderColor: colors.gold.default,
    backgroundColor: colors.gold.default,
  },
  checkmark: {
    color: colors.text.onGold,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
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
});

export default RecordContributionScreen;
