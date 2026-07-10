import React, { useMemo, useState } from "react";
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
import { format } from "date-fns";
import { SafeAreaView } from "react-native-safe-area-context";
import Avatar from "../../components/common/Avatar";
import CalendarDateField from "../../components/common/CalendarDateField";
import FeedbackModal, { FeedbackModalType } from "../../components/common/FeedbackModal";
import EmptyState from "../../components/common/EmptyState";
import GoldButton from "../../components/common/GoldButton";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ScreenHeader from "../../components/common/ScreenHeader";
import { useMembers } from "../../hooks/useMembers";
import { createAdHocCharge } from "../../services/financeService";
import { useAuthStore } from "../../store/authStore";
import { colors, spacing, typography } from "../../theme";
import { LedgerType } from "../../types/finance";
import { getInitials } from "../../utils/getInitials";
import { safeGoBack } from "../../utils/navigation";
import { isAdmin } from "../../utils/roleGuard";

interface FormValues {
  label: string;
  amount: string;
  dueDate: string;
  note: string;
}

const chargeTypes: { label: string; value: LedgerType }[] = [
  { label: "Levy", value: "levy" },
  { label: "Fine", value: "fine" },
  { label: "Pledge", value: "pledge" },
];

type TargetMode = "all" | "single" | "multiple";

const parseDate = (value: string) => {
  if (!value.trim()) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return undefined;
  }
  const parsed = new Date(`${value.trim()}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const AdHocChargeScreen = ({ navigation, route }: any) => {
  const routeMemberId = route.params?.memberId as string | undefined;
  const { user } = useAuthStore();
  const admin = isAdmin(user);
  const { members, error, loading } = useMembers({ enabled: admin });
  const [type, setType] = useState<LedgerType>("levy");
  const [targetMode, setTargetMode] = useState<TargetMode>(
    routeMemberId ? "single" : "all",
  );
  const [selectedUid, setSelectedUid] = useState(routeMemberId ?? "");
  const [selectedUids, setSelectedUids] = useState<string[]>(
    routeMemberId ? [routeMemberId] : [],
  );
  const [memberQuery, setMemberQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
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
  const activeMembers = useMemo(
    () => members.filter((member) => member.status === "active"),
    [members],
  );
  const filteredActiveMembers = useMemo(() => {
    const query = memberQuery.trim().toLowerCase();
    if (!query) {
      return activeMembers;
    }
    return activeMembers.filter((member) =>
      `${member.fullName} ${member.email} ${member.phone}`
        .toLowerCase()
        .includes(query),
    );
  }, [activeMembers, memberQuery]);
  const { control, handleSubmit, formState } = useForm<FormValues>({
    defaultValues: {
      label: "",
      amount: "",
      dueDate: format(new Date(), "yyyy-MM-dd"),
      note: "",
    },
  });

  const handleTargetModeChange = (mode: TargetMode) => {
    setTargetMode(mode);
    if (mode === "single") {
      setSelectedUid((current) => current || selectedUids[0] || "");
      return;
    }
    if (mode === "multiple") {
      setSelectedUids((current) =>
        current.length > 0 ? current : selectedUid ? [selectedUid] : [],
      );
    }
  };

  const toggleSelectedUid = (uid: string) => {
    setSelectedUids((current) =>
      current.includes(uid)
        ? current.filter((selected) => selected !== uid)
        : [...current, uid],
    );
  };

  const onSubmit = async (values: FormValues) => {
    if (submitting) {
      return;
    }
    const amount = Number(values.amount.replace(/,/g, ""));
    const dueDate = parseDate(values.dueDate);
    const memberIds =
      targetMode === "all"
        ? activeMembers.map((member) => member.uid)
        : targetMode === "single"
          ? selectedUid
            ? [selectedUid]
            : []
          : selectedUids;

    if (dueDate === undefined) {
      setModal({ visible: true, type: "error", title: "Due date invalid", message: "Use date format YYYY-MM-DD or leave it blank.", onPrimary: closeModal });
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setModal({ visible: true, type: "error", title: "Amount required", message: "Enter an amount greater than zero.", onPrimary: closeModal });
      return;
    }
    if (memberIds.length === 0) {
      setModal({ visible: true, type: "error", title: "Member required", message: "Choose who should receive this charge.", onPrimary: closeModal });
      return;
    }

    try {
      setSubmitting(true);
      await createAdHocCharge({
        memberIds,
        type,
        label: values.label.trim(),
        amount,
        dueDate,
        note: values.note.trim(),
      });
      safeGoBack(navigation, "FinanceAdmin");
    } catch (submitError) {
      setModal({ visible: true, type: "error", title: "Charge not created", message: submitError instanceof Error ? submitError.message : "Please try again.", onPrimary: closeModal });
    } finally {
      setSubmitting(false);
    }
  };

  if (!admin) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Ad Hoc Charge"
          showBack
          onBack={() => safeGoBack(navigation, "FinanceAdmin")}
        />
        <EmptyState
          icon="!"
          title="Admin only"
          message="Only admins can create ad hoc charges."
        />
      </SafeAreaView>
    );
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || activeMembers.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Ad Hoc Charge"
          showBack
          onBack={() => safeGoBack(navigation, "FinanceAdmin")}
        />
        <EmptyState
          icon="!"
          title={error ? "Members unavailable" : "No active members"}
          message={
            error ??
            "Active members are required before creating an ad hoc charge."
          }
          actionLabel="Back to Finance"
          onAction={() => safeGoBack(navigation, "FinanceAdmin")}
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
          primaryLabel={modal.primaryLabel}
          onPrimary={modal.onPrimary}
          secondaryLabel={modal.secondaryLabel}
          onSecondary={modal.onSecondary}
        />
      )}
      <ScreenHeader
        title="Ad Hoc Charge"
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
          <Text style={styles.sectionLabel}>CHARGE TYPE</Text>
          <ChipRow
            options={chargeTypes}
            selectedValue={type}
            onChange={setType}
          />
          <Text style={styles.sectionLabel}>TARGET</Text>
          <ChipRow
            options={[
              { label: "All Active", value: "all" },
              { label: "One Member", value: "single" },
              { label: "Selected Members", value: "multiple" },
            ]}
            selectedValue={targetMode}
            onChange={handleTargetModeChange}
          />
          {targetMode === "multiple" && (
            <Text style={styles.selectionHint}>
              {selectedUids.length} member{selectedUids.length === 1 ? "" : "s"} selected
            </Text>
          )}
          {(targetMode === "single" || targetMode === "multiple") && (
            <>
              <TextInput
                value={memberQuery}
                onChangeText={setMemberQuery}
                autoCapitalize="none"
                placeholder="Search member name, email, or phone"
                placeholderTextColor={colors.text.tertiary}
                style={styles.searchInput}
              />
              <View style={styles.memberList}>
                {filteredActiveMembers.length === 0 ? (
                  <View style={styles.noticeCard}>
                    <Text style={styles.noticeText}>
                      No active members match this search.
                    </Text>
                  </View>
                ) : filteredActiveMembers.map((member) => {
                  const selected =
                    targetMode === "single"
                      ? selectedUid === member.uid
                      : selectedUids.includes(member.uid);
                  return (
                    <TouchableOpacity
                      key={member.uid}
                      style={[
                        styles.memberRow,
                        selected && styles.selectedMember,
                      ]}
                      onPress={() =>
                        targetMode === "single"
                          ? setSelectedUid(member.uid)
                          : toggleSelectedUid(member.uid)
                      }
                      activeOpacity={0.8}
                    >
                      <Avatar
                        initials={getInitials(member.fullName)}
                        photoURL={member.photoURL}
                        size={38}
                        statusDot={member.financialStatus}
                      />
                      <Text style={styles.memberName}>{member.fullName}</Text>
                      <View
                        style={[styles.radio, selected && styles.radioSelected]}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
          <Field
            control={control}
            error={formState.errors.label?.message}
            label="LABEL"
            name="label"
            rules={{ required: "Label is required." }}
          />
          <Field
            control={control}
            error={formState.errors.amount?.message}
            keyboardType="numeric"
            label="AMOUNT"
            name="amount"
            rules={{
              required: "Amount is required.",
              pattern: {
                value: /^[0-9,]+$/,
                message: "Use numbers only.",
              },
            }}
          />
          <Controller
            control={control}
            name="dueDate"
            render={({ field: { onChange, value } }) => (
              <CalendarDateField
                value={value}
                onChange={onChange}
                label="DUE DATE"
                error={formState.errors.dueDate?.message}
              />
            )}
          />
          <Field
            control={control}
            error={formState.errors.note?.message}
            label="NOTE"
            multiline
            name="note"
          />
          <GoldButton
            label="Create Charge"
            onPress={handleSubmit(onSubmit)}
            loading={submitting}
            fullWidth
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const Field = ({
  control,
  error,
  keyboardType,
  label,
  multiline,
  name,
  rules,
}: any) => (
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
          multiline={multiline}
          placeholderTextColor={colors.text.tertiary}
          style={[
            styles.input,
            multiline && styles.textArea,
            error && styles.inputError,
          ]}
        />
      )}
    />
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

const ChipRow = <T extends string>({
  onChange,
  options,
  selectedValue,
}: {
  options: { label: string; value: T }[];
  selectedValue: T;
  onChange: (value: T) => void;
}) => (
  <View style={styles.chipRow}>
    {options.map((option) => {
      const selected = selectedValue === option.value;
      return (
        <TouchableOpacity
          key={option.value}
          style={[styles.chip, selected && styles.selectedChip]}
          onPress={() => onChange(option.value)}
          activeOpacity={0.8}
        >
          <Text style={[styles.chipText, selected && styles.selectedChipText]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  sectionLabel: {
    marginTop: spacing.sm,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.text.secondary,
    letterSpacing: 0.8,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  selectedChip: {
    borderColor: colors.gold.default,
    backgroundColor: `${colors.gold.default}18`,
  },
  chipText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },
  selectedChipText: { color: colors.gold.light },
  selectionHint: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  searchInput: {
    minHeight: 48,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.tertiary,
    color: colors.text.primary,
  },
  memberList: { gap: spacing.sm },
  memberRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  selectedMember: {
    borderColor: colors.gold.default,
    backgroundColor: `${colors.gold.default}12`,
  },
  memberName: {
    flex: 1,
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
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
  textArea: { minHeight: 92, textAlignVertical: "top" },
  inputError: { borderColor: colors.status.error },
  errorText: { fontSize: typography.size.xs, color: colors.status.error },
  noticeCard: {
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  noticeText: { fontSize: typography.size.sm, color: colors.text.secondary },
});

export default AdHocChargeScreen;
