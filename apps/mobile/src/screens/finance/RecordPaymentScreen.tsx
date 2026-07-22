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
import FeedbackModal, { FeedbackModalType } from "../../components/common/FeedbackModal";
import GoldButton from "../../components/common/GoldButton";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ScreenHeader from "../../components/common/ScreenHeader";
import { useFinance } from "../../hooks/useFinance";
import { useMembers } from "../../hooks/useMembers";
import { recordBulkPayments, recordPayment } from "../../services/financeService";
import { useAuthStore } from "../../store/authStore";
import { colors, spacing, typography } from "../../theme";
import { LedgerEntry } from "../../types/finance";
import { User } from "../../types/user";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDisplayDate } from "../../utils/formatDate";
import { getChargeDisplayStatus } from "../../utils/financeChargeStatus";
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

type RecordMode = "single" | "bulk";
const defaultPaymentMethod = "Bank transfer";
type MemberPaymentFilter = "all" | "paid" | "unpaid" | "overdue";

const memberPaymentFilters: { label: string; value: MemberPaymentFilter }[] = [
  { label: "All", value: "all" },
  { label: "Paid", value: "paid" },
  { label: "Unpaid", value: "unpaid" },
  { label: "Overdue", value: "overdue" },
];

const paymentMethodForCharge = (charge: LedgerEntry) =>
  `${defaultPaymentMethod} - ${charge.label}`;

const referenceForCharge = (charge: LedgerEntry) =>
  charge.dueDate
    ? `${charge.label} (${formatDisplayDate(charge.dueDate)})`
    : charge.label;

const searchableMemberText = (member: User) =>
  `${member.fullName} ${member.email} ${member.phone}`.toLowerCase();

const oldestOpenChargeForMember = (
  uid: string,
  entries: LedgerEntry[],
): LedgerEntry | null => {
  const charges = entries
    .filter(
      (e) => e.uid === uid && e.type !== "payment" && getChargeOutstanding(e) > 0,
    )
    .sort(
      (a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0),
    );
  return charges[0] ?? null;
};

const paymentFilterForMember = (
  member: User,
  entries: LedgerEntry[],
): Exclude<MemberPaymentFilter, "all"> => {
  const charges = entries.filter(
    (entry) => entry.uid === member.uid && entry.type !== "payment",
  );
  const outstanding = charges.reduce(
    (sum, entry) => sum + getChargeOutstanding(entry),
    0,
  );
  if (outstanding <= 0) {
    return "paid";
  }
  return charges.some(
    (entry) =>
      getChargeOutstanding(entry) > 0 &&
      getChargeDisplayStatus(entry) === "overdue",
  )
    ? "overdue"
    : "unpaid";
};

const RecordPaymentScreen = ({ navigation, route }: any) => {
  const routeMemberId = route.params?.memberId as string | undefined;
  const { user } = useAuthStore();
  const admin = isAdmin(user);
  const { members, error, loading } = useMembers({ enabled: admin });
  const [mode, setMode] = useState<RecordMode>("single");
  const [memberFilter, setMemberFilter] =
    useState<MemberPaymentFilter>("all");
  const [memberQuery, setMemberQuery] = useState("");
  const [selectedUid, setSelectedUid] = useState(routeMemberId ?? "");
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [selectedChargeId, setSelectedChargeId] = useState("");
  const [chargeMenuOpen, setChargeMenuOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bulkModal, setBulkModal] = useState<
    | { visible: false }
    | { visible: true; type: "success"; count: number; onDone: () => void }
    | { visible: true; type: "error"; message: string }
  >({ visible: false });
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
  const {
    control,
    handleSubmit,
    formState,
    setValue,
  } = useForm<FormValues>({
    defaultValues: {
      amount: "",
      paymentMethod: defaultPaymentMethod,
      reference: "",
      note: "",
    },
  });
  const {
    error: allChargesError,
    ledgerEntries: allLedgerEntries,
    loading: allChargesLoading,
  } = useFinance(undefined, admin);
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
  const filteredMembers = useMemo(() => {
    const query = memberQuery.trim().toLowerCase();
    return members.filter((member) => {
      const status = paymentFilterForMember(member, allLedgerEntries);
      const matchesFilter = memberFilter === "all" || status === memberFilter;
      const matchesSearch = !query || searchableMemberText(member).includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [allLedgerEntries, memberFilter, memberQuery, members]);

  const bulkItems = useMemo(
    () =>
      selectedUids.flatMap((uid) => {
        const charge = oldestOpenChargeForMember(uid, allLedgerEntries);
        const member = members.find((m) => m.uid === uid);
        if (!charge || !member) {
          return [];
        }
        return [{ uid, member, charge, amount: getChargeOutstanding(charge) }];
      }),
    [selectedUids, allLedgerEntries, members],
  );

  const bulkTotal = useMemo(
    () => bulkItems.reduce((sum, item) => sum + item.amount, 0),
    [bulkItems],
  );

  const toggleBulkMember = (uid: string) => {
    setSelectedUids((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid],
    );
  };

  useEffect(() => {
    if (mode === "bulk") {
      setMemberFilter("unpaid");
      setSelectedUids([]);
      setSelectedUid("");
    } else {
      setSelectedUids([]);
      setMemberFilter("all");
    }
  }, [mode]);

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
      setValue("paymentMethod", paymentMethodForCharge(charge), {
        shouldValidate: true,
      });
      setValue("reference", referenceForCharge(charge), {
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
      setModal({ visible: true, type: "error", title: "Member required", message: "Choose the member who made this payment.", onPrimary: closeModal });
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setModal({ visible: true, type: "error", title: "Amount required", message: "Enter an amount greater than zero.", onPrimary: closeModal });
      return;
    }
    if (!selectedCharge) {
      setModal({ visible: true, type: "error", title: "Charge required", message: "Choose which open charge this payment should settle.", onPrimary: closeModal });
      return;
    }
    if (amount > getChargeOutstanding(selectedCharge)) {
      setModal({ visible: true, type: "error", title: "Amount too high", message: "Payment cannot exceed the selected charge balance.", onPrimary: closeModal });
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
      setModal({ visible: true, type: "error", title: "Payment not recorded", message: submitError instanceof Error ? submitError.message : "Please try again.", onPrimary: closeModal });
    } finally {
      setSubmitting(false);
    }
  };

  const onBulkSubmit = async (values: FormValues) => {
    if (submitting) {
      return;
    }
    if (bulkItems.length === 0) {
      setBulkModal({
        visible: true,
        type: "error",
        message: "Select at least one member with an open charge.",
      });
      return;
    }
    try {
      setSubmitting(true);
      const count = await recordBulkPayments(
        bulkItems.map((item) => ({
          uid: item.uid,
          chargeEntryId: item.charge.id,
          amount: item.amount,
          paymentMethod: values.paymentMethod.trim(),
          reference: values.reference.trim(),
          note: values.note.trim(),
        })),
      );
      setBulkModal({
        visible: true,
        type: "success",
        count,
        onDone: () => setBulkModal({ visible: false }),
      });
    } catch (submitError) {
      setBulkModal({
        visible: true,
        type: "error",
        message:
          submitError instanceof Error
            ? submitError.message
            : "Please try again.",
      });
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

  if (loading || allChargesLoading) {
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
      <FeedbackModal
        visible={bulkModal.visible}
        type={bulkModal.visible ? bulkModal.type : "error"}
        title={
          bulkModal.visible
            ? bulkModal.type === "success"
              ? "Payments Recorded"
              : "Could Not Record"
            : ""
        }
        message={
          bulkModal.visible
            ? bulkModal.type === "success"
              ? `${bulkModal.count} payment${bulkModal.count === 1 ? "" : "s"} recorded successfully.`
              : bulkModal.message
            : ""
        }
        primaryLabel={
          bulkModal.visible && bulkModal.type === "success" ? "Done" : "OK"
        }
        onPrimary={() => {
          if (bulkModal.visible && bulkModal.type === "success") {
            setBulkModal({ visible: false });
            bulkModal.onDone();
          } else {
            setBulkModal({ visible: false });
          }
        }}
      />
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
          <ChipRow
            options={[
              { label: "Single", value: "single" as RecordMode },
              { label: "Bulk", value: "bulk" as RecordMode },
            ]}
            selectedValue={mode}
            onChange={setMode}
          />
          <Text style={styles.sectionLabel}>
            {mode === "bulk" ? "SELECT MEMBERS" : "MEMBER"}
          </Text>
          {allChargesError && (
            <View style={styles.noticeCard}>
              <Text style={styles.errorText}>{allChargesError}</Text>
            </View>
          )}
          <TextInput
            value={memberQuery}
            onChangeText={setMemberQuery}
            autoCapitalize="none"
            placeholder="Search member name, email, or phone"
            placeholderTextColor={colors.text.tertiary}
            style={styles.searchInput}
          />
          <ChipRow
            options={memberPaymentFilters}
            selectedValue={memberFilter}
            onChange={setMemberFilter}
          />
          <View style={styles.memberList}>
            {filteredMembers.length === 0 ? (
              <View style={styles.noticeCard}>
                <Text style={styles.noticeText}>
                  No members match this search or filter.
                </Text>
              </View>
            ) : filteredMembers.map((member) => {
              if (mode === "bulk") {
                const checked = selectedUids.includes(member.uid);
                const openCharge = oldestOpenChargeForMember(member.uid, allLedgerEntries);
                const disabled = !openCharge;
                const status = paymentFilterForMember(member, allLedgerEntries);
                return (
                  <TouchableOpacity
                    key={member.uid}
                    style={[
                      styles.memberRow,
                      checked && styles.selectedMember,
                      disabled && styles.memberRowDisabled,
                    ]}
                    onPress={() => !disabled && toggleBulkMember(member.uid)}
                    activeOpacity={disabled ? 1 : 0.8}
                  >
                    <Avatar
                      initials={getInitials(member.fullName)}
                      photoURL={member.photoURL}
                      size={38}
                      statusDot={member.financialStatus}
                    />
                    <View style={styles.memberText}>
                      <Text
                        style={[
                          styles.memberName,
                          disabled && styles.memberNameDisabled,
                        ]}
                      >
                        {member.fullName}
                      </Text>
                      <Text style={styles.memberMeta}>
                        {disabled
                          ? "No open charges"
                          : `${openCharge.label} · ${formatCurrency(getChargeOutstanding(openCharge))}`}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.memberStatus,
                        status === "paid" && styles.memberStatusPaid,
                        status === "overdue" && styles.memberStatusOverdue,
                      ]}
                    >
                      {status.toUpperCase()}
                    </Text>
                    <View
                      style={[
                        styles.checkbox,
                        checked && styles.checkboxChecked,
                        disabled && styles.checkboxDisabled,
                      ]}
                    >
                      {checked && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              }

              const selected = selectedUid === member.uid;
              const status = paymentFilterForMember(member, allLedgerEntries);
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
                  <Text
                    style={[
                      styles.memberStatus,
                      status === "paid" && styles.memberStatusPaid,
                      status === "overdue" && styles.memberStatusOverdue,
                    ]}
                  >
                    {status.toUpperCase()}
                  </Text>
                  <View
                    style={[styles.radio, selected && styles.radioSelected]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {mode === "bulk" ? (
            <>
              {selectedUids.length > 0 && (
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>BULK TOTAL</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(bulkTotal)}
                  </Text>
                  <Text style={styles.summaryMeta}>
                    {bulkItems.length} member{bulkItems.length === 1 ? "" : "s"} selected
                  </Text>
                </View>
              )}
            </>
          ) : (
            <>
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
                  setValue("paymentMethod", paymentMethodForCharge(charge), {
                    shouldValidate: true,
                  });
                  setValue("reference", referenceForCharge(charge), {
                    shouldValidate: true,
                  });
                }}
                open={chargeMenuOpen}
                openCharges={openCharges}
                selectedCharge={selectedCharge}
                selectedUid={selectedUid}
                setOpen={setChargeMenuOpen}
              />
            </>
          )}

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
            label={
              mode === "bulk"
                ? `Record ${bulkItems.length > 0 ? bulkItems.length : ""} Payment${bulkItems.length === 1 ? "" : "s"}`.trim()
                : "Record Payment"
            }
            onPress={
              mode === "bulk"
                ? handleSubmit(onBulkSubmit)
                : handleSubmit(onSubmit)
            }
            loading={submitting}
            fullWidth
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

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
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  selectedChip: {
    borderColor: colors.gold.default,
    backgroundColor: `${colors.gold.default}18`,
  },
  chipText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },
  selectedChipText: { color: colors.gold.light },
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
  memberStatus: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.gold.light,
  },
  memberStatusPaid: { color: colors.status.success },
  memberStatusOverdue: { color: colors.status.error },
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
  checkboxDisabled: {
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.secondary,
  },
  checkmark: {
    fontSize: 11,
    fontWeight: typography.weight.bold,
    color: colors.bg.secondary,
  },
  memberRowDisabled: { opacity: 0.45 },
  memberNameDisabled: { color: colors.text.tertiary },
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
  summaryMeta: { fontSize: typography.size.sm, color: colors.text.secondary },
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
