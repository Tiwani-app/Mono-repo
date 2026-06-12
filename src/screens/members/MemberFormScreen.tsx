import React, { useEffect, useState } from "react";
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
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { SafeAreaView } from "react-native-safe-area-context";
import CalendarDateField from "../../components/common/CalendarDateField";
import EmptyState from "../../components/common/EmptyState";
import Icon from "../../components/common/FeatherIcon";
import GoldButton from "../../components/common/GoldButton";
import OutlineButton from "../../components/common/OutlineButton";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ScreenHeader from "../../components/common/ScreenHeader";
import {
  createMember,
  getMember,
  updateMember,
} from "../../services/membersService";
import { useAuthStore } from "../../store/authStore";
import { colors, spacing, typography } from "../../theme";
import {
  Child,
  FinancialStatus,
  MemberStatus,
  Role,
  User,
} from "../../types/user";
import { emailRules } from "../../utils/validators";
import { safeGoBack } from "../../utils/navigation";
import { isAdmin } from "../../utils/roleGuard";

interface FormValues {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  outstandingBalance: string;
  spouseName: string;
  spouseDateOfBirth: string;
  weddingAnniversary: string;
  children: Child[];
}

const roleOptions: { label: string; value: Role }[] = [
  { label: "Member", value: "member" },
  { label: "Admin", value: "admin" },
  { label: "Electoral Chair", value: "electoral_chairman" },
];

const statusOptions: { label: string; value: MemberStatus }[] = [
  { label: "Active", value: "active" },
  { label: "Pending", value: "pending" },
  { label: "Inactive", value: "inactive" },
  { label: "Suspended", value: "suspended" },
];

const financialOptions: { label: string; value: FinancialStatus }[] = [
  { label: "Green", value: "green" },
  { label: "Red", value: "red" },
];

const maritalOptions: { label: string; value: User["maritalStatus"] }[] = [
  { label: "Single", value: "single" },
  { label: "Married", value: "married" },
  { label: "Divorced", value: "divorced" },
  { label: "Widowed", value: "widowed" },
];

const MemberFormScreen = ({ navigation, route }: any) => {
  const memberId = route.params?.memberId as string | undefined;
  const [role, setRole] = useState<Role>("member");
  const [status, setStatus] = useState<MemberStatus>("active");
  const [financialStatus, setFinancialStatus] =
    useState<FinancialStatus>("green");
  const [maritalStatus, setMaritalStatus] =
    useState<User["maritalStatus"]>("single");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(memberId));
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuthStore();
  const admin = isAdmin(user);
  const { control, handleSubmit, reset, formState } = useForm<FormValues>({
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      address: "",
      outstandingBalance: "0",
      spouseName: "",
      spouseDateOfBirth: "",
      weddingAnniversary: "",
      children: [],
    },
  });
  const { append, fields, remove } = useFieldArray({
    control,
    name: "children",
  });

  useEffect(() => {
    if (!admin || !memberId) {
      return;
    }
    getMember(memberId)
      .then((member) => {
        reset({
          fullName: member.fullName,
          email: member.email,
          phone: member.phone,
          address: member.address,
          outstandingBalance: String(member.outstandingBalance),
          spouseName: member.spouseName ?? "",
          spouseDateOfBirth: member.spouseDateOfBirth ?? "",
          weddingAnniversary: member.weddingAnniversary ?? "",
          children: member.children,
        });
        setRole(member.role);
        setStatus(member.status);
        setFinancialStatus(member.financialStatus);
        setMaritalStatus(member.maritalStatus);
      })
      .catch((error) =>
        setLoadError(
          error instanceof Error
            ? error.message
            : "Could not load this member.",
        ),
      )
      .finally(() => setLoading(false));
  }, [admin, memberId, reset]);

  const onSubmit = async (values: FormValues) => {
    if (submitting) {
      return;
    }
    const outstandingBalance = Number(
      values.outstandingBalance.replace(/,/g, ""),
    );
    if (!Number.isFinite(outstandingBalance) || outstandingBalance < 0) {
      Alert.alert(
        "Balance invalid",
        "Outstanding balance must be zero or more.",
      );
      return;
    }
    const children = values.children
      .map((child) => ({
        name: child.name.trim(),
        dateOfBirth: child.dateOfBirth.trim(),
      }))
      .filter((child) => child.name || child.dateOfBirth);
    if (children.some((child) => !child.name)) {
      Alert.alert("Child name required", "Enter a name for each child.");
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        address: values.address.trim(),
        outstandingBalance,
        role,
        status,
        financialStatus,
        maritalStatus,
        spouseName: values.spouseName.trim() || null,
        spouseDateOfBirth: values.spouseDateOfBirth.trim() || null,
        weddingAnniversary: values.weddingAnniversary.trim() || null,
        children,
      };
      if (memberId) {
        await updateMember(memberId, payload);
      } else {
        const createdMember = await createMember(payload);
        if (createdMember.setupDelivery) {
          const delivery = createdMember.setupDelivery;
          Alert.alert(
            "Member created",
            delivery.setupEmailSent
              ? "The setup email was sent to the new member."
              : [
                  "The member was created, but the setup email was not sent.",
                  delivery.setupEmailError
                    ? `Reason: ${delivery.setupEmailError}`
                    : null,
                  delivery.setupLink ? `Setup link: ${delivery.setupLink}` : null,
                ]
                  .filter(Boolean)
                  .join("\n\n"),
          );
        }
      }
      safeGoBack(navigation, "MembersList");
    } catch (error) {
      Alert.alert(
        "Member not saved",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!admin) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Member"
          showBack
          onBack={() => safeGoBack(navigation, "DashboardHome")}
        />
        <EmptyState
          icon="!"
          title="Admin only"
          message="Only admins can add and edit members."
        />
      </SafeAreaView>
    );
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Member"
          showBack
          onBack={() => safeGoBack(navigation, "MembersList")}
        />
        <EmptyState
          icon="!"
          title="Member unavailable"
          message={loadError}
          actionLabel="Back to Members"
          onAction={() => safeGoBack(navigation, "MembersList")}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title={memberId ? "Edit Member" : "Add Member"}
        showBack
        onBack={() => safeGoBack(navigation, "DashboardHome")}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {!memberId && (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Account provisioning</Text>
              <Text style={styles.infoText}>
                This will create the Firebase Auth account and matching member profile together.
              </Text>
            </View>
          )}
          <Field
            control={control}
            error={formState.errors.fullName?.message}
            label="FULL NAME"
            name="fullName"
            rules={{ required: "Full name is required." }}
          />
          <Field
            control={control}
            error={formState.errors.email?.message}
            keyboardType="email-address"
            label="EMAIL"
            name="email"
            rules={emailRules}
          />
          <Field
            control={control}
            error={formState.errors.phone?.message}
            keyboardType="phone-pad"
            label="PHONE"
            name="phone"
            rules={{ required: "Phone number is required." }}
          />
          <Field
            control={control}
            error={formState.errors.address?.message}
            label="ADDRESS"
            multiline
            name="address"
          />
          <Text style={styles.sectionLabel}>ROLE</Text>
          <ChipRow
            options={roleOptions}
            selectedValue={role}
            onChange={setRole}
          />
          <Text style={styles.sectionLabel}>MEMBER STATUS</Text>
          <ChipRow
            options={statusOptions}
            selectedValue={status}
            onChange={setStatus}
          />
          <Text style={styles.sectionLabel}>FINANCIAL STATUS</Text>
          <ChipRow
            options={financialOptions}
            selectedValue={financialStatus}
            onChange={setFinancialStatus}
          />
          <Field
            control={control}
            error={formState.errors.outstandingBalance?.message}
            keyboardType="numeric"
            label="OUTSTANDING BALANCE"
            name="outstandingBalance"
            rules={{
              required: "Outstanding balance is required.",
              pattern: {
                value: /^[0-9,]+$/,
                message: "Use numbers only.",
              },
            }}
          />
          <Text style={styles.sectionLabel}>FAMILY DETAILS</Text>
          <ChipRow
            options={maritalOptions}
            selectedValue={maritalStatus}
            onChange={setMaritalStatus}
          />
          <Field
            control={control}
            error={formState.errors.spouseName?.message}
            label="SPOUSE NAME"
            name="spouseName"
          />
          <Controller
            control={control}
            name="spouseDateOfBirth"
            render={({ field: { onChange, value } }) => (
              <CalendarDateField
                allowEmpty
                value={value}
                onChange={onChange}
                label="SPOUSE DATE OF BIRTH"
                placeholder="Choose spouse birthday"
              />
            )}
          />
          <Controller
            control={control}
            name="weddingAnniversary"
            render={({ field: { onChange, value } }) => (
              <CalendarDateField
                allowEmpty
                value={value}
                onChange={onChange}
                label="WEDDING ANNIVERSARY"
                placeholder="Choose anniversary"
              />
            )}
          />
          <View style={styles.childrenHeader}>
            <Text style={styles.sectionLabel}>CHILDREN</Text>
            <OutlineButton
              label="Add Child"
              onPress={() => append({ name: "", dateOfBirth: "" })}
            />
          </View>
          {fields.length === 0 ? (
            <View style={styles.emptyFamilyCard}>
              <Text style={styles.emptyFamilyText}>
                No children added for this member.
              </Text>
            </View>
          ) : (
            fields.map((field, index) => (
              <View key={field.id} style={styles.childCard}>
                <View style={styles.childHeader}>
                  <Text style={styles.childTitle}>Child {index + 1}</Text>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => remove(index)}
                    activeOpacity={0.8}
                  >
                    <Icon
                      name="trash-2"
                      size={18}
                      color={colors.status.error}
                    />
                  </TouchableOpacity>
                </View>
                <Field
                  control={control}
                  error={formState.errors.children?.[index]?.name?.message}
                  label="CHILD NAME"
                  name={`children.${index}.name`}
                />
                <Controller
                  control={control}
                  name={`children.${index}.dateOfBirth`}
                  render={({ field: { onChange, value } }) => (
                    <CalendarDateField
                      allowEmpty
                      value={value}
                      onChange={onChange}
                      label="CHILD DATE OF BIRTH"
                      placeholder="Choose child birthday"
                    />
                  )}
                />
              </View>
            ))
          )}
          <GoldButton
            label={memberId ? "Save Member" : "Create Member"}
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
          autoCapitalize={keyboardType === "email-address" ? "none" : undefined}
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
  infoCard: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  infoTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  infoText: {
    fontSize: typography.size.sm,
    lineHeight: 20,
    color: colors.text.secondary,
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
  childrenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  emptyFamilyCard: {
    minHeight: 56,
    justifyContent: "center",
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  emptyFamilyText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  childCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  childHeader: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  childTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  removeButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: colors.bg.tertiary,
  },
});

export default MemberFormScreen;
