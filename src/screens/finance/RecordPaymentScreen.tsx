import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
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
import GoldButton from "../../components/common/GoldButton";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ScreenHeader from "../../components/common/ScreenHeader";
import { useFinance } from "../../hooks/useFinance";
import { useMembers } from "../../hooks/useMembers";
import { recordPayment } from "../../services/financeService";
import { useAuthStore } from "../../store/authStore";
import { colors, spacing, typography } from "../../theme";
import { LedgerEntry } from "../../types/finance";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDisplayDate } from "../../utils/formatDate";
import { getInitials } from "../../utils/getInitials";
import { getChargeOutstanding } from "../../utils/financeTotals";
import { safeGoBack } from "../../utils/navigation";
import { isAdmin } from "../../utils/roleGuard";

interface FormValues {
  amount: string;
  paymentMethod: string;
  reference: string;
  note: string;
}

const RecordPaymentScreen = ({ navigation, route }: any) => {
  const routeMemberId = route.params?.memberId as string | undefined;
  const { user } = useAuthStore();
  const admin = isAdmin(user);
  const { members, error, loading } = useMembers({ enabled: admin });
  const [selectedUid, setSelectedUid] = useState(routeMemberId ?? "");
  const [selectedChargeId, setSelectedChargeId] = useState("");
  const [chargeMenuOpen, setChargeMenuOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const {
    control,
    handleSubmit,
    formState,
    setValue,
  } = useForm<FormValues>({
    defaultValues: {
      amount: "",
      paymentMethod: "Bank transfer",
      reference: "",
      note: "",
    },
  });
  const {
    error: chargesError,
    ledgerEntries,
    loading: chargesLoading,
  } = useFinance(admin && selectedUid ? selectedUid : undefined);

  const selectedMember = useMemo(
    () => members.find((member) => member.uid === selectedUid),
    [members, selectedUid],
  );
  const openCharges = useMemo(
    () =>
      ledgerEntries
        .filter(
          (entry) =>
            entry.uid === selectedUid &&
            entry.type !== "payment" &&
            getChargeOutstanding(entry) > 0,
        )
        .sort((left, right) => {
          const leftMillis = left.dueDate?.getTime() ?? 0;
          const rightMillis = right.dueDate?.getTime() ?? 0;
          return leftMillis - rightMillis;
        }),
    [ledgerEntries, selectedUid],
  );
  const selectedCharge = openCharges.find(
    (charge) => charge.id === selectedChargeId,
  );

  useEffect(() => {
    setSelectedChargeId("");
    setChargeMenuOpen(false);
  }, [selectedUid]);

  useEffect(() => {
    if (!selectedUid || selectedChargeId) {
      return;
    }
    if (openCharges.length === 1) {
      const [charge] = openCharges;
      setSelectedChargeId(charge.id);
      setValue("amount", String(getChargeOutstanding(charge)), {
        shouldValidate: true,
      });
    }
  }, [openCharges, selectedChargeId, selectedUid, setValue]);

  const onSubmit = async (values: FormValues) => {
    if (submitting) {
      return;
    }
    const amount = Number(values.amount.replace(/,/g, ""));
    if (!selectedUid) {
      Alert.alert(
        "Member required",
        "Choose the member who made this payment.",
      );
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Amount required", "Enter an amount greater than zero.");
      return;
    }
    if (!selectedCharge) {
      Alert.alert(
        "Charge required",
        "Choose which open charge this payment should settle.",
      );
      return;
    }
    if (amount > getChargeOutstanding(selectedCharge)) {
      Alert.alert(
        "Amount too high",
        "Payment cannot exceed the selected charge balance.",
      );
      return;
    }

    try {
      setSubmitting(true);
      await recordPayment({
        uid: selectedUid,
        chargeEntryId: selectedCharge.id,
        amount,
        paymentMethod: values.paymentMethod.trim(),
        reference: values.reference.trim(),
        note: values.note.trim(),
      });
      safeGoBack(navigation, "FinanceAdmin");
    } catch (submitError) {
      Alert.alert(
        "Payment not recorded",
        submitError instanceof Error
          ? submitError.message
          : "Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!admin) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Record Payment"
          showBack
          onBack={() => safeGoBack(navigation, "FinanceAdmin")}
        />
        <EmptyState
          icon="!"
          title="Admin only"
          message="Only admins can record member payments."
        />
      </SafeAreaView>
    );
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || members.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Record Payment"
          showBack
          onBack={() => safeGoBack(navigation, "FinanceAdmin")}
        />
        <EmptyState
          icon="!"
          title={error ? "Members unavailable" : "No members available"}
          message={error ?? "Add members before recording a payment."}
          actionLabel="Back to Finance"
          onAction={() => safeGoBack(navigation, "FinanceAdmin")}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Record Payment"
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
          <Text style={styles.sectionLabel}>MEMBER</Text>
          <View style={styles.memberList}>
            {members.map((member) => {
              const selected = selectedUid === member.uid;
              return (
                <TouchableOpacity
                  key={member.uid}
                  style={[styles.memberRow, selected && styles.selectedMember]}
                  onPress={() => setSelectedUid(member.uid)}
                  activeOpacity={0.8}
                >
                  <Avatar
                    initials={getInitials(member.fullName)}
                    photoURL={member.photoURL}
                    size={38}
                    statusDot={member.financialStatus}
                  />
                  <View style={styles.memberText}>
                    <Text style={styles.memberName}>{member.fullName}</Text>
                    <Text style={styles.memberMeta}>
                      Outstanding {formatCurrency(member.outstandingBalance)}
                    </Text>
                  </View>
                  <View
                    style={[styles.radio, selected && styles.radioSelected]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
          {selectedMember && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>SELECTED BALANCE</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(selectedMember.outstandingBalance)}
              </Text>
            </View>
          )}
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
          <Text style={styles.sectionLabel}>REFERENCE / CHARGE</Text>
          <ChargeDropdown
            error={chargesError}
            loading={chargesLoading}
            onChange={(charge) => {
              setSelectedChargeId(charge.id);
              setChargeMenuOpen(false);
              setValue("amount", String(getChargeOutstanding(charge)), {
                shouldValidate: true,
              });
            }}
            open={chargeMenuOpen}
            openCharges={openCharges}
            selectedCharge={selectedCharge}
            selectedUid={selectedUid}
            setOpen={setChargeMenuOpen}
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
            label="BANK / RECEIPT REFERENCE"
            name="reference"
          />
          <Field
            control={control}
            error={formState.errors.note?.message}
            label="NOTE"
            multiline
            name="note"
          />
          <GoldButton
            label="Record Payment"
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

const ChargeDropdown = ({
  error,
  loading,
  onChange,
  open,
  openCharges,
  selectedCharge,
  selectedUid,
  setOpen,
}: {
  error: string | null;
  loading: boolean;
  openCharges: LedgerEntry[];
  selectedCharge: LedgerEntry | undefined;
  selectedUid: string;
  open: boolean;
  onChange: (charge: LedgerEntry) => void;
  setOpen: (open: boolean) => void;
}) => {
  if (!selectedUid) {
    return (
      <View style={styles.noticeCard}>
        <Text style={styles.noticeText}>Select a member to load open charges.</Text>
      </View>
    );
  }
  if (loading) {
    return (
      <View style={styles.noticeCard}>
        <Text style={styles.noticeText}>Loading open charges...</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.noticeCard}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }
  if (openCharges.length === 0) {
    return (
      <View style={styles.noticeCard}>
        <Text style={styles.noticeText}>This member has no open charges.</Text>
      </View>
    );
  }

  return (
    <View style={styles.chargeDropdown}>
      <TouchableOpacity
        style={[styles.chargeButton, open && styles.chargeButtonOpen]}
        onPress={() => setOpen(!open)}
        activeOpacity={0.85}
      >
        <View style={styles.chargeButtonCopy}>
          <Text
            style={[
              styles.chargeButtonTitle,
              !selectedCharge && styles.placeholderText,
            ]}
          >
            {selectedCharge?.label ?? "Select the charge being paid"}
          </Text>
          <Text style={styles.chargeButtonMeta}>
            {selectedCharge
              ? chargeMeta(selectedCharge)
              : `${openCharges.length} open charge${
                  openCharges.length === 1 ? "" : "s"
                } available`}
          </Text>
        </View>
        <Text style={styles.dropdownChevron}>{open ? "^" : "v"}</Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.chargePanel}>
          {openCharges.map((charge) => {
            const selected = selectedCharge?.id === charge.id;
            return (
              <TouchableOpacity
                key={charge.id}
                style={[
                  styles.chargeOption,
                  selected && styles.chargeOptionSelected,
                ]}
                onPress={() => onChange(charge)}
                activeOpacity={0.85}
              >
                <View style={styles.chargeOptionCopy}>
                  <Text
                    style={[
                      styles.chargeOptionTitle,
                      selected && styles.chargeOptionTitleSelected,
                    ]}
                  >
                    {charge.label}
                  </Text>
                  <Text style={styles.chargeOptionMeta}>
                    {chargeMeta(charge)}
                  </Text>
                </View>
                <Text style={styles.chargeAmount}>
                  {formatCurrency(getChargeOutstanding(charge))}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const chargeMeta = (charge: LedgerEntry) => {
  const dueText = charge.dueDate
    ? `Due ${formatDisplayDate(charge.dueDate)}`
    : "No due date";
  const overdue =
    charge.dueDate !== null && charge.dueDate.getTime() < Date.now();
  return `${dueText} · ${overdue ? "overdue" : "not overdue"}`;
};

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
  memberList: { gap: spacing.sm },
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
  selectedMember: {
    borderColor: colors.gold.default,
    backgroundColor: `${colors.gold.default}12`,
  },
  memberText: { flex: 1, gap: spacing.xs },
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
  summaryCard: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  summaryLabel: { fontSize: typography.size.xs, color: colors.text.secondary },
  summaryValue: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.black,
    color: colors.gold.light,
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
  chargeDropdown: { gap: spacing.xs },
  chargeButton: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.tertiary,
  },
  chargeButtonOpen: { borderColor: colors.gold.default },
  chargeButtonCopy: { flex: 1, gap: spacing.xs },
  chargeButtonTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  placeholderText: { color: colors.text.secondary },
  chargeButtonMeta: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
  },
  dropdownChevron: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.gold.default,
  },
  chargePanel: {
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  chargeOption: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
  },
  chargeOptionSelected: { backgroundColor: `${colors.gold.default}14` },
  chargeOptionCopy: { flex: 1, gap: spacing.xs },
  chargeOptionTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  chargeOptionTitleSelected: { color: colors.gold.light },
  chargeOptionMeta: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
  },
  chargeAmount: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.black,
    color: colors.gold.light,
  },
});

export default RecordPaymentScreen;
