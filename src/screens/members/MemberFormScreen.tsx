import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmptyState from '../../components/common/EmptyState';
import GoldButton from '../../components/common/GoldButton';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ScreenHeader from '../../components/common/ScreenHeader';
import {
  createMember,
  getMember,
  updateMember,
} from '../../services/membersService';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, typography } from '../../theme';
import { FinancialStatus, MemberStatus, Role } from '../../types/user';
import { emailRules } from '../../utils/validators';
import { isAdmin } from '../../utils/roleGuard';

interface FormValues {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  outstandingBalance: string;
}

const roleOptions: {label: string; value: Role}[] = [
  {label: 'Member', value: 'member'},
  {label: 'Admin', value: 'admin'},
  {label: 'Electoral Chair', value: 'electoral_chairman'},
];

const statusOptions: {label: string; value: MemberStatus}[] = [
  {label: 'Active', value: 'active'},
  {label: 'Pending', value: 'pending'},
  {label: 'Inactive', value: 'inactive'},
  {label: 'Suspended', value: 'suspended'},
];

const financialOptions: {label: string; value: FinancialStatus}[] = [
  {label: 'Green', value: 'green'},
  {label: 'Red', value: 'red'},
];

const MemberFormScreen = ({ navigation, route }: any) => {
  const memberId = route.params?.memberId as string | undefined;
  const [role, setRole] = useState<Role>('member');
  const [status, setStatus] = useState<MemberStatus>('active');
  const [financialStatus, setFinancialStatus] = useState<FinancialStatus>('green');
  const [loading, setLoading] = useState(Boolean(memberId));
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuthStore();
  const { control, handleSubmit, reset, formState } = useForm<FormValues>({
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      address: '',
      outstandingBalance: '0',
    },
  });

  useEffect(() => {
    if (!memberId) {
      return;
    }
    getMember(memberId)
      .then(member => {
        reset({
          fullName: member.fullName,
          email: member.email,
          phone: member.phone,
          address: member.address,
          outstandingBalance: String(member.outstandingBalance),
        });
        setRole(member.role);
        setStatus(member.status);
        setFinancialStatus(member.financialStatus);
      })
      .catch(() => Alert.alert('Members', 'Could not load this member.'))
      .finally(() => setLoading(false));
  }, [memberId, reset]);

  const onSubmit = async (values: FormValues) => {
    const outstandingBalance = Number(values.outstandingBalance.replace(/,/g, ''));
    if (!Number.isFinite(outstandingBalance) || outstandingBalance < 0) {
      Alert.alert('Balance invalid', 'Outstanding balance must be zero or more.');
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
      };
      if (memberId) {
        await updateMember(memberId, payload);
      } else {
        await createMember(payload);
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert(
        'Member not saved',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdmin(user)) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Member" showBack onBack={navigation.goBack} />
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

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title={memberId ? 'Edit Member' : 'Add Member'}
        showBack
        onBack={navigation.goBack}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Field
            control={control}
            error={formState.errors.fullName?.message}
            label="FULL NAME"
            name="fullName"
            rules={{required: 'Full name is required.'}}
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
            rules={{required: 'Phone number is required.'}}
          />
          <Field
            control={control}
            error={formState.errors.address?.message}
            label="ADDRESS"
            multiline
            name="address"
          />
          <Text style={styles.sectionLabel}>ROLE</Text>
          <ChipRow options={roleOptions} selectedValue={role} onChange={setRole} />
          <Text style={styles.sectionLabel}>MEMBER STATUS</Text>
          <ChipRow options={statusOptions} selectedValue={status} onChange={setStatus} />
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
              required: 'Outstanding balance is required.',
              pattern: {
                value: /^[0-9,]+$/,
                message: 'Use numbers only.',
              },
            }}
          />
          <GoldButton
            label={memberId ? 'Save Member' : 'Create Member'}
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
      render={({field: {onBlur, onChange, value}}) => (
        <TextInput
          value={value}
          onBlur={onBlur}
          onChangeText={onChange}
          keyboardType={keyboardType}
          multiline={multiline}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : undefined}
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
  options: {label: string; value: T}[];
  selectedValue: T;
  onChange: (value: T) => void;
}) => (
  <View style={styles.chipRow}>
    {options.map(option => {
      const selected = selectedValue === option.value;
      return (
        <TouchableOpacity
          key={option.value}
          style={[styles.chip, selected && styles.selectedChip]}
          onPress={() => onChange(option.value)}
          activeOpacity={0.8}>
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
  textArea: { minHeight: 92, textAlignVertical: 'top' },
  inputError: { borderColor: colors.status.error },
  errorText: { fontSize: typography.size.xs, color: colors.status.error },
  sectionLabel: {
    marginTop: spacing.sm,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.text.secondary,
    letterSpacing: 0.8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
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
});

export default MemberFormScreen;
