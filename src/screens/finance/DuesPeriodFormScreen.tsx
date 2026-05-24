import React, { useState } from 'react';
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
import EmptyState from '../../components/common/EmptyState';
import GoldButton from '../../components/common/GoldButton';
import ScreenHeader from '../../components/common/ScreenHeader';
import { createDuesPeriod } from '../../services/financeService';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, typography } from '../../theme';
import { DuesPeriod } from '../../types/finance';
import { isAdmin } from '../../utils/roleGuard';

interface FormValues {
  name: string;
  amount: string;
  dueDate: string;
}

const statusOptions: {label: string; value: DuesPeriod['status']}[] = [
  {label: 'Active', value: 'active'},
  {label: 'Settled', value: 'settled'},
  {label: 'Overdue', value: 'overdue'},
];

const parseDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return null;
  }
  const parsed = new Date(`${value.trim()}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const DuesPeriodFormScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const [status, setStatus] = useState<DuesPeriod['status']>('active');
  const [submitting, setSubmitting] = useState(false);
  const { control, handleSubmit, formState } = useForm<FormValues>({
    defaultValues: {
      name: '',
      amount: '',
      dueDate: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  const onSubmit = async (values: FormValues) => {
    const dueDate = parseDate(values.dueDate);
    const amount = Number(values.amount.replace(/,/g, ''));
    if (!dueDate) {
      Alert.alert('Due date required', 'Use date format YYYY-MM-DD.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Amount required', 'Enter an amount greater than zero.');
      return;
    }

    try {
      setSubmitting(true);
      await createDuesPeriod({
        name: values.name.trim(),
        amount,
        dueDate,
        status,
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert(
        'Dues period not saved',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdmin(user)) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="New Dues" showBack onBack={navigation.goBack} />
        <EmptyState
          icon="!"
          title="Admin only"
          message="Only admins can create dues periods."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="New Dues Period" showBack onBack={navigation.goBack} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Field
            control={control}
            error={formState.errors.name?.message}
            label="PERIOD NAME"
            name="name"
            rules={{ required: 'Name is required.' }}
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
            rules={{
              required: 'Due date is required.',
              pattern: {
                value: /^\d{4}-\d{2}-\d{2}$/,
                message: 'Use YYYY-MM-DD.',
              },
            }}
          />
          <Text style={styles.sectionLabel}>STATUS</Text>
          <ChipRow
            options={statusOptions}
            selectedValue={status}
            onChange={setStatus}
          />
          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>Ledger impact</Text>
            <Text style={styles.noteText}>
              Creating a dues period adds an unpaid dues row for every active
              member in the mock data.
            </Text>
          </View>
          <GoldButton
            label="Create Dues Period"
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
          placeholderTextColor={colors.text.tertiary}
          style={[styles.input, error && styles.inputError]}
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

export default DuesPeriodFormScreen;
