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
import { useMembers } from '../../hooks/useMembers';
import {
  createElection,
  getElection,
  updateElection,
} from '../../services/votingService';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, typography } from '../../theme';
import { Election } from '../../types/voting';
import { safeGoBack } from '../../utils/navigation';
import { isAdmin } from '../../utils/roleGuard';
import { findFinanciallyBlockedCandidateNames } from '../../utils/votingGuards';

interface FormValues {
  title: string;
  office: string;
  candidates: {name: string; manifestoLine: string}[];
}

const ballotOptions: {label: string; value: Election['ballotType']}[] = [
  {label: 'Secret', value: 'secret'},
  {label: 'Open', value: 'open'},
];

const statusOptions: {label: string; value: Election['status']}[] = [
  {label: 'Draft', value: 'draft'},
  {label: 'Open', value: 'open'},
  {label: 'Closed', value: 'closed'},
];

const ElectionFormScreen = ({ navigation, route }: any) => {
  const electionId = route.params?.electionId as string | undefined;
  const [ballotType, setBallotType] = useState<Election['ballotType']>('secret');
  const [status, setStatus] = useState<Election['status']>('open');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(electionId));
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuthStore();
  const {
    error: membersError,
    loading: membersLoading,
    members,
  } = useMembers();
  const { control, handleSubmit, reset, formState } = useForm<FormValues>({
    defaultValues: {
      title: '',
      office: 'President',
      candidates: [
        {name: '', manifestoLine: ''},
        {name: '', manifestoLine: ''},
      ],
    },
  });
  const { append, fields, remove } = useFieldArray({ control, name: 'candidates' });

  useEffect(() => {
    if (!electionId) {
      return;
    }
    getElection(electionId)
      .then(election => {
        const firstRace = election.races[0];
        reset({
          title: election.title,
          office: firstRace?.office ?? 'President',
          candidates:
            firstRace?.candidates.map(candidate => ({
              name: candidate.name,
              manifestoLine: candidate.manifestoLine,
            })) ?? [],
        });
        setBallotType(election.ballotType);
        setStatus(election.status);
      })
      .catch(error =>
        setLoadError(
          error instanceof Error ? error.message : 'Could not load this election.',
        ),
      )
      .finally(() => setLoading(false));
  }, [electionId, reset]);

  const onSubmit = async (values: FormValues) => {
    if (submitting) {
      return;
    }
    const candidates = values.candidates
      .map(candidate => ({
        name: candidate.name.trim(),
        manifestoLine: candidate.manifestoLine.trim(),
      }))
      .filter(candidate => candidate.name);
    const uniqueNames = new Set(candidates.map(candidate => candidate.name.toLowerCase()));
    if (candidates.length < 2 || uniqueNames.size < 2) {
      Alert.alert('Candidates required', 'Add at least two unique candidates.');
      return;
    }
    const blockedCandidates = findFinanciallyBlockedCandidateNames(
      candidates.map(candidate => candidate.name),
      members,
    );
    if (blockedCandidates.length > 0) {
      Alert.alert(
        'Candidate not eligible',
        `${blockedCandidates.join(', ')} must be in good financial standing before standing for election.`,
      );
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: values.title.trim(),
        ballotType,
        status,
        races: [
          {
            office: values.office.trim(),
            candidates,
          },
        ],
      };
      if (electionId) {
        await updateElection(electionId, payload);
      } else {
        await createElection(payload);
      }
      safeGoBack(navigation, 'VotingHub');
    } catch (error) {
      Alert.alert(
        'Election not saved',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdmin(user)) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Election" showBack onBack={() => safeGoBack(navigation, 'VotingHub')} />
        <EmptyState
          icon="!"
          title="Admin only"
          message="Only admins can create and edit elections."
        />
      </SafeAreaView>
    );
  }

  if (loading || membersLoading) {
    return <LoadingSpinner />;
  }

  if (loadError || membersError) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Election" showBack onBack={() => safeGoBack(navigation, 'VotingHub')} />
        <EmptyState
          icon="!"
          title="Election unavailable"
          message={loadError ?? membersError ?? 'Please try again.'}
          actionLabel="Back to Voting"
          onAction={() => safeGoBack(navigation, 'VotingHub')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title={electionId ? 'Edit Election' : 'New Election'}
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
          <Text style={styles.sectionLabel}>BALLOT TYPE</Text>
          <ChipRow options={ballotOptions} selectedValue={ballotType} onChange={setBallotType} />
          <Text style={styles.sectionLabel}>STATUS</Text>
          <ChipRow options={statusOptions} selectedValue={status} onChange={setStatus} />
          <Field
            control={control}
            error={formState.errors.office?.message}
            label="OFFICE"
            name="office"
            rules={{required: 'Office is required.'}}
          />
          <Text style={styles.sectionLabel}>CANDIDATES</Text>
          {fields.map((field, index) => (
            <View key={field.id} style={styles.candidateCard}>
              <View style={styles.candidateHeader}>
                <Text style={styles.candidateTitle}>Candidate {index + 1}</Text>
                {fields.length > 2 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => remove(index)}
                    activeOpacity={0.8}>
                    <Icon name="trash-2" size={18} color={colors.status.error} />
                  </TouchableOpacity>
                )}
              </View>
              <Field
                control={control}
                error={formState.errors.candidates?.[index]?.name?.message}
                label="NAME"
                name={`candidates.${index}.name`}
                rules={{required: index < 2 ? 'Name is required.' : false}}
              />
              <Field
                control={control}
                error={formState.errors.candidates?.[index]?.manifestoLine?.message}
                label="MANIFESTO LINE"
                multiline
                name={`candidates.${index}.manifestoLine`}
              />
            </View>
          ))}
          <OutlineButton
            label="Add Candidate"
            onPress={() => append({name: '', manifestoLine: ''})}
            fullWidth
          />
          <GoldButton
            label={electionId ? 'Save Election' : 'Create Election'}
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
  textArea: {minHeight: 82, textAlignVertical: 'top'},
  inputError: {borderColor: colors.status.error},
  errorText: {fontSize: typography.size.xs, color: colors.status.error},
  sectionLabel: {
    marginTop: spacing.sm,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.text.secondary,
    letterSpacing: 0.8,
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
  candidateCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  candidateHeader: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
  candidateTitle: {
    flex: 1,
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  removeButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: `${colors.status.error}14`,
  },
});

export default ElectionFormScreen;
