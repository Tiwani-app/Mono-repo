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
import { format } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmptyState from '../../components/common/EmptyState';
import GoldButton from '../../components/common/GoldButton';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ScreenHeader from '../../components/common/ScreenHeader';
import {
  createEvent,
  getEvent,
  updateEvent,
} from '../../services/eventsService';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, typography } from '../../theme';
import { EventCategory, EventStatus } from '../../types/event';
import { safeGoBack } from '../../utils/navigation';
import { isAdmin } from '../../utils/roleGuard';

interface FormValues {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  capacity: string;
}

const categoryOptions: {label: string; value: EventCategory}[] = [
  {label: 'Meeting', value: 'meeting'},
  {label: 'Social', value: 'social'},
  {label: 'Volunteer', value: 'volunteer'},
  {label: 'Committee', value: 'committee'},
];

const statusOptions: {label: string; value: EventStatus}[] = [
  {label: 'Draft', value: 'draft'},
  {label: 'Published', value: 'published'},
  {label: 'Cancelled', value: 'cancelled'},
  {label: 'Completed', value: 'completed'},
];

const parseDateTime = (dateValue: string, timeValue: string) => {
  const trimmedDate = dateValue.trim();
  const trimmedTime = timeValue.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate) || !/^\d{2}:\d{2}$/.test(trimmedTime)) {
    return null;
  }
  const parsed = new Date(`${trimmedDate}T${trimmedTime}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const EventFormScreen = ({ navigation, route }: any) => {
  const eventId = route.params?.eventId as string | undefined;
  const [category, setCategory] = useState<EventCategory>('meeting');
  const [status, setStatus] = useState<EventStatus>('published');
  const [loading, setLoading] = useState(Boolean(eventId));
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuthStore();
  const { control, handleSubmit, reset, formState } = useForm<FormValues>({
    defaultValues: {
      title: '',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: '10:00',
      location: '',
      capacity: '0',
    },
  });

  useEffect(() => {
    if (!eventId) {
      return;
    }
    getEvent(eventId)
      .then(event => {
        reset({
          title: event.title,
          description: event.description,
          date: format(event.dateTime, 'yyyy-MM-dd'),
          time: format(event.dateTime, 'HH:mm'),
          location: event.location,
          capacity: String(event.capacity),
        });
        setCategory(event.category);
        setStatus(event.status);
      })
      .catch(() => Alert.alert('Events', 'Could not load this event.'))
      .finally(() => setLoading(false));
  }, [eventId, reset]);

  const onSubmit = async (values: FormValues) => {
    const dateTime = parseDateTime(values.date, values.time);
    if (!dateTime) {
      Alert.alert('Date required', 'Use date format YYYY-MM-DD and time format HH:mm.');
      return;
    }
    const capacity = Number(values.capacity);
    if (!Number.isInteger(capacity) || capacity < 0) {
      Alert.alert('Capacity required', 'Capacity must be zero or a positive whole number.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: values.title.trim(),
        description: values.description.trim(),
        category,
        dateTime,
        location: values.location.trim(),
        capacity,
        status,
      };
      if (eventId) {
        await updateEvent(eventId, payload);
      } else {
        await createEvent(payload);
      }
      safeGoBack(navigation, 'EventsList');
    } catch (error) {
      Alert.alert(
        'Event not saved',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdmin(user)) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Event" showBack onBack={() => safeGoBack(navigation, 'EventsList')} />
        <EmptyState
          icon="!"
          title="Admin only"
          message="Only admins can create and edit events."
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
        title={eventId ? 'Edit Event' : 'New Event'}
        showBack
        onBack={() => safeGoBack(navigation, 'EventsList')}
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
            error={formState.errors.description?.message}
            label="DESCRIPTION"
            multiline
            name="description"
            rules={{required: 'Description is required.'}}
          />
          <Text style={styles.sectionLabel}>CATEGORY</Text>
          <ChipRow
            options={categoryOptions}
            selectedValue={category}
            onChange={setCategory}
          />
          <View style={styles.twoColumn}>
            <Field
              control={control}
              error={formState.errors.date?.message}
              label="DATE"
              name="date"
              rules={{
                required: 'Date is required.',
                pattern: {
                  value: /^\d{4}-\d{2}-\d{2}$/,
                  message: 'Use YYYY-MM-DD.',
                },
              }}
            />
            <Field
              control={control}
              error={formState.errors.time?.message}
              label="TIME"
              name="time"
              rules={{
                required: 'Time is required.',
                pattern: {
                  value: /^\d{2}:\d{2}$/,
                  message: 'Use HH:mm.',
                },
              }}
            />
          </View>
          <Field
            control={control}
            error={formState.errors.location?.message}
            label="LOCATION"
            name="location"
            rules={{required: 'Location is required.'}}
          />
          <Field
            control={control}
            error={formState.errors.capacity?.message}
            keyboardType="numeric"
            label="CAPACITY"
            name="capacity"
            rules={{
              required: 'Capacity is required.',
              pattern: {
                value: /^\d+$/,
                message: 'Use whole numbers only.',
              },
            }}
          />
          <Text style={styles.helpText}>Use 0 for unlimited capacity.</Text>
          <Text style={styles.sectionLabel}>STATUS</Text>
          <ChipRow
            options={statusOptions}
            selectedValue={status}
            onChange={setStatus}
          />
          <GoldButton
            label={eventId ? 'Save Event' : 'Create Event'}
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
  safe: {flex: 1, backgroundColor: colors.bg.secondary},
  flex: {flex: 1},
  content: {padding: spacing.lg, gap: spacing.md},
  field: {flex: 1, gap: spacing.xs},
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
  twoColumn: {flexDirection: 'row', gap: spacing.md},
  helpText: {fontSize: typography.size.xs, color: colors.text.tertiary},
});

export default EventFormScreen;
