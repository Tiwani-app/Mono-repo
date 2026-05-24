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
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmptyState from '../../components/common/EmptyState';
import Icon from '../../components/common/FeatherIcon';
import GoldButton from '../../components/common/GoldButton';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import OutlineButton from '../../components/common/OutlineButton';
import ScreenHeader from '../../components/common/ScreenHeader';
import {
  createPoll,
  getPoll,
  updatePoll,
} from '../../services/votingService';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, typography } from '../../theme';
import { Poll } from '../../types/voting';
import { safeGoBack } from '../../utils/navigation';
import { isAdmin } from '../../utils/roleGuard';

interface FormValues {
  title: string;
  question: string;
  options: { label: string }[];
}

const statusOptions: {label: string; value: Poll['status']}[] = [
  {label: 'Draft', value: 'draft'},
  {label: 'Open', value: 'open'},
  {label: 'Closed', value: 'closed'},
];

const PollFormScreen = ({ navigation, route }: any) => {
  const pollId = route.params?.pollId as string | undefined;
  const [status, setStatus] = useState<Poll['status']>('open');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(pollId));
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuthStore();
  const { control, handleSubmit, reset, formState } = useForm<FormValues>({
    defaultValues: {
      title: '',
      question: '',
      options: [{ label: '' }, { label: '' }],
    },
  });
  const { append, fields, remove } = useFieldArray({ control, name: 'options' });

  useEffect(() => {
    if (!pollId) {
      return;
    }
    getPoll(pollId)
      .then(poll => {
        reset({
          title: poll.title,
          question: poll.question,
          options: poll.options.map(option => ({ label: option.label })),
        });
        setStatus(poll.status);
      })
      .catch(error =>
        setLoadError(
          error instanceof Error ? error.message : 'Could not load this poll.',
        ),
      )
      .finally(() => setLoading(false));
  }, [pollId, reset]);

  const onSubmit = async (values: FormValues) => {
    const options = values.options
      .map(option => option.label.trim())
      .filter(Boolean);
    const uniqueOptions = Array.from(new Set(options));
    if (uniqueOptions.length < 2) {
      Alert.alert('Options required', 'Add at least two unique options.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: values.title.trim(),
        question: values.question.trim(),
        status,
        options: uniqueOptions,
      };
      if (pollId) {
        await updatePoll(pollId, payload);
      } else {
        await createPoll(payload);
      }
      safeGoBack(navigation, 'VotingHub');
    } catch (error) {
      Alert.alert(
        'Poll not saved',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdmin(user)) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Poll" showBack onBack={() => safeGoBack(navigation, 'VotingHub')} />
        <EmptyState
          icon="!"
          title="Admin only"
          message="Only admins can create and edit polls."
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
        <ScreenHeader title="Poll" showBack onBack={() => safeGoBack(navigation, 'VotingHub')} />
        <EmptyState
          icon="!"
          title="Poll unavailable"
          message={loadError}
          actionLabel="Back to Voting"
          onAction={() => safeGoBack(navigation, 'VotingHub')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title={pollId ? 'Edit Poll' : 'New Poll'}
        showBack
        onBack={() => safeGoBack(navigation, 'VotingHub')}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Field
            control={control}
            error={formState.errors.title?.message}
            label="TITLE"
            name="title"
            rules={{required: 'Title is required.'}}
          />
          <Field
            control={control}
            error={formState.errors.question?.message}
            label="QUESTION"
            multiline
            name="question"
            rules={{required: 'Question is required.'}}
          />
          <Text style={styles.sectionLabel}>OPTIONS</Text>
          {fields.map((field, index) => (
            <View key={field.id} style={styles.optionRow}>
              <View style={styles.optionInput}>
                <Field
                  control={control}
                  error={formState.errors.options?.[index]?.label?.message}
                  label={`OPTION ${index + 1}`}
                  name={`options.${index}.label`}
                  rules={{required: index < 2 ? 'Option is required.' : false}}
                />
              </View>
              {fields.length > 2 && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => remove(index)}
                  activeOpacity={0.8}>
                  <Icon name="trash-2" size={18} color={colors.status.error} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          <OutlineButton
            label="Add Option"
            onPress={() => append({ label: '' })}
            fullWidth
          />
          <Text style={styles.sectionLabel}>STATUS</Text>
          <ChipRow
            options={statusOptions}
            selectedValue={status}
            onChange={setStatus}
          />
          <GoldButton
            label={pollId ? 'Save Poll' : 'Create Poll'}
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
  safe: {flex: 1, backgroundColor: colors.bg.secondary},
  flex: {flex: 1},
  content: {padding: spacing.lg, gap: spacing.md},
  field: {gap: spacing.xs},
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
  textArea: {minHeight: 92, textAlignVertical: 'top'},
  inputError: {borderColor: colors.status.error},
  errorText: {fontSize: typography.size.xs, color: colors.status.error},
  sectionLabel: {
    marginTop: spacing.sm,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.text.secondary,
    letterSpacing: 0.8,
  },
  optionRow: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm},
  optionInput: {flex: 1},
  removeButton: {
    width: 48,
    height: 48,
    marginTop: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: `${colors.status.error}14`,
  },
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
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
  selectedChipText: {color: colors.gold.light},
});

export default PollFormScreen;
