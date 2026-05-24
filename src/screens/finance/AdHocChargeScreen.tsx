import React, { useMemo, useState } from 'react';
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
import { format } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import Avatar from '../../components/common/Avatar';
import EmptyState from '../../components/common/EmptyState';
import GoldButton from '../../components/common/GoldButton';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ScreenHeader from '../../components/common/ScreenHeader';
import { useMembers } from '../../hooks/useMembers';
import { createAdHocCharge } from '../../services/financeService';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, typography } from '../../theme';
import { LedgerType } from '../../types/finance';
import { getInitials } from '../../utils/getInitials';
import { safeGoBack } from '../../utils/navigation';
import { isAdmin } from '../../utils/roleGuard';

interface FormValues {
  label: string;
  amount: string;
  dueDate: string;
  note: string;
}

const chargeTypes: {label: string; value: LedgerType}[] = [
  {label: 'Levy', value: 'levy'},
  {label: 'Fine', value: 'fine'},
  {label: 'Pledge', value: 'pledge'},
];

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
  const { members, error, loading } = useMembers();
  const [type, setType] = useState<LedgerType>('levy');
  const [targetMode, setTargetMode] = useState<'all' | 'single'>(
    routeMemberId ? 'single' : 'all',
  );
  const [selectedUid, setSelectedUid] = useState(routeMemberId ?? '');
  const [submitting, setSubmitting] = useState(false);
  const activeMembers = useMemo(
    () => members.filter(member => member.status === 'active'),
    [members],
  );
  const { control, handleSubmit, formState } = useForm<FormValues>({
    defaultValues: {
      label: '',
      amount: '',
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      note: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    const amount = Number(values.amount.replace(/,/g, ''));
    const dueDate = parseDate(values.dueDate);
    const memberIds =
      targetMode === 'all'
        ? activeMembers.map(member => member.uid)
        : selectedUid
          ? [selectedUid]
          : [];

    if (dueDate === undefined) {
      Alert.alert('Due date invalid', 'Use date format YYYY-MM-DD or leave it blank.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Amount required', 'Enter an amount greater than zero.');
      return;
    }
    if (memberIds.length === 0) {
      Alert.alert('Member required', 'Choose who should receive this charge.');
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
      safeGoBack(navigation, 'FinanceAdmin');
    } catch (error) {
      Alert.alert(
        'Charge not created',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdmin(user)) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Ad Hoc Charge" showBack onBack={() => safeGoBack(navigation, 'FinanceAdmin')} />
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
        <ScreenHeader title="Ad Hoc Charge" showBack onBack={() => safeGoBack(navigation, 'FinanceAdmin')} />
        <EmptyState
          icon="!"
          title={error ? 'Members unavailable' : 'No active members'}
          message={error ?? 'Active members are required before creating an ad hoc charge.'}
          actionLabel="Back to Finance"
          onAction={() => safeGoBack(navigation, 'FinanceAdmin')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Ad Hoc Charge" showBack onBack={() => safeGoBack(navigation, 'FinanceAdmin')} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionLabel}>CHARGE TYPE</Text>
          <ChipRow options={chargeTypes} selectedValue={type} onChange={setType} />
          <Text style={styles.sectionLabel}>TARGET</Text>
          <ChipRow
            options={[
              {label: 'All Active', value: 'all'},
              {label: 'One Member', value: 'single'},
            ]}
            selectedValue={targetMode}
            onChange={setTargetMode}
          />
          {targetMode === 'single' && (
            <View style={styles.memberList}>
              {activeMembers.map(member => {
                const selected = selectedUid === member.uid;
                return (
                  <TouchableOpacity
                    key={member.uid}
                    style={[styles.memberRow, selected && styles.selectedMember]}
                    onPress={() => setSelectedUid(member.uid)}
                    activeOpacity={0.8}>
                    <Avatar
                      initials={getInitials(member.fullName)}
                      photoURL={member.photoURL}
                      size={38}
                      statusDot={member.financialStatus}
                    />
                    <Text style={styles.memberName}>{member.fullName}</Text>
                    <View style={[styles.radio, selected && styles.radioSelected]} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          <Field
            control={control}
            error={formState.errors.label?.message}
            label="LABEL"
            name="label"
            rules={{ required: 'Label is required.' }}
          />
          <Field
            control={control}
            error={formState.errors.amount?.message}
            keyboardType="numeric"
            label="AMOUNT"
            name="amount"
            rules={{
              required: 'Amount is required.',
              pattern: {
                value: /^[0-9,]+$/,
                message: 'Use numbers only.',
              },
            }}
          />
          <Field
            control={control}
            error={formState.errors.dueDate?.message}
            label="DUE DATE"
            name="dueDate"
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
      render={({field: {onBlur, onChange, value}}) => (
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
  memberList: { gap: spacing.sm },
  memberRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
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
  textArea: { minHeight: 92, textAlignVertical: 'top' },
  inputError: { borderColor: colors.status.error },
  errorText: { fontSize: typography.size.xs, color: colors.status.error },
});

export default AdHocChargeScreen;
