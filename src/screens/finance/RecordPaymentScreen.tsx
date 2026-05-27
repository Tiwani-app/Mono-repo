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
import { SafeAreaView } from 'react-native-safe-area-context';
import Avatar from '../../components/common/Avatar';
import EmptyState from '../../components/common/EmptyState';
import GoldButton from '../../components/common/GoldButton';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ScreenHeader from '../../components/common/ScreenHeader';
import { useMembers } from '../../hooks/useMembers';
import { recordPayment } from '../../services/financeService';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, typography } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';
import { getInitials } from '../../utils/getInitials';
import { safeGoBack } from '../../utils/navigation';
import { isAdmin } from '../../utils/roleGuard';

interface FormValues {
  amount: string;
  paymentMethod: string;
  reference: string;
  note: string;
}

const RecordPaymentScreen = ({ navigation, route }: any) => {
  const routeMemberId = route.params?.memberId as string | undefined;
  const { user } = useAuthStore();
  const { members, error, loading } = useMembers();
  const [selectedUid, setSelectedUid] = useState(routeMemberId ?? '');
  const [submitting, setSubmitting] = useState(false);
  const { control, handleSubmit, formState } = useForm<FormValues>({
    defaultValues: {
      amount: '',
      paymentMethod: 'Bank transfer',
      reference: '',
      note: '',
    },
  });

  const selectedMember = useMemo(
    () => members.find(member => member.uid === selectedUid),
    [members, selectedUid],
  );

  const onSubmit = async (values: FormValues) => {
    if (submitting) {
      return;
    }
    const amount = Number(values.amount.replace(/,/g, ''));
    if (!selectedUid) {
      Alert.alert('Member required', 'Choose the member who made this payment.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Amount required', 'Enter an amount greater than zero.');
      return;
    }

    try {
      setSubmitting(true);
      await recordPayment({
        uid: selectedUid,
        amount,
        paymentMethod: values.paymentMethod.trim(),
        reference: values.reference.trim(),
        note: values.note.trim(),
      });
      safeGoBack(navigation, 'FinanceAdmin');
    } catch (submitError) {
      Alert.alert(
        'Payment not recorded',
        submitError instanceof Error ? submitError.message : 'Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdmin(user)) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Record Payment" showBack onBack={() => safeGoBack(navigation, 'FinanceAdmin')} />
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
        <ScreenHeader title="Record Payment" showBack onBack={() => safeGoBack(navigation, 'FinanceAdmin')} />
        <EmptyState
          icon="!"
          title={error ? 'Members unavailable' : 'No members available'}
          message={error ?? 'Add members before recording a payment.'}
          actionLabel="Back to Finance"
          onAction={() => safeGoBack(navigation, 'FinanceAdmin')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Record Payment" showBack onBack={() => safeGoBack(navigation, 'FinanceAdmin')} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionLabel}>MEMBER</Text>
          <View style={styles.memberList}>
            {members.map(member => {
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
                  <View style={styles.memberText}>
                    <Text style={styles.memberName}>{member.fullName}</Text>
                    <Text style={styles.memberMeta}>
                      Outstanding {formatCurrency(member.outstandingBalance)}
                    </Text>
                  </View>
                  <View style={[styles.radio, selected && styles.radioSelected]} />
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
              required: 'Amount is required.',
              pattern: {
                value: /^[0-9,]+$/,
                message: 'Use numbers only.',
              },
            }}
          />
          <Field
            control={control}
            error={formState.errors.paymentMethod?.message}
            label="PAYMENT METHOD"
            name="paymentMethod"
            rules={{ required: 'Payment method is required.' }}
          />
          <Field
            control={control}
            error={formState.errors.reference?.message}
            label="REFERENCE"
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
  textArea: { minHeight: 92, textAlignVertical: 'top' },
  inputError: { borderColor: colors.status.error },
  errorText: { fontSize: typography.size.xs, color: colors.status.error },
});

export default RecordPaymentScreen;
