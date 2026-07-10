import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Controller, useForm } from "react-hook-form";
import { format } from "date-fns";
import { SafeAreaView } from "react-native-safe-area-context";
import CalendarDateField from "../../components/common/CalendarDateField";
import EmptyState from "../../components/common/EmptyState";
import GoldButton from "../../components/common/GoldButton";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ScreenHeader from "../../components/common/ScreenHeader";
import {
  createEvent,
  getEvent,
  updateEvent,
} from "../../services/eventsService";
import { useAuthStore } from "../../store/authStore";
import { useEventsStore } from "../../store/eventsStore";
import { colors, spacing, typography } from "../../theme";
import { EventCategory, EventStatus } from "../../types/event";
import { isValidMeetingLink } from "../../utils/eventLinks";
import { safeGoBack } from "../../utils/navigation";
import { isAdmin } from "../../utils/roleGuard";

interface FormValues {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  meetingLink: string;
  capacity: string;
}

const categoryOptions: { label: string; value: EventCategory }[] = [
  { label: "Meeting", value: "meeting" },
  { label: "Social", value: "social" },
  { label: "Volunteer", value: "volunteer" },
  { label: "Committee", value: "committee" },
];

const statusOptions: { label: string; value: EventStatus }[] = [
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Completed", value: "completed" },
];

const hourOptions = Array.from({ length: 12 }, (_, index) => {
  const value = String(index + 1);
  return { label: value, value };
});

const minuteOptions = Array.from({ length: 12 }, (_, index) => {
  const value = String(index * 5).padStart(2, "0");
  return { label: value, value };
});

const periodOptions = [
  { label: "AM", value: "AM" },
  { label: "PM", value: "PM" },
];

const parseDateTime = (dateValue: string, timeValue: string) => {
  const trimmedDate = dateValue.trim();
  const trimmedTime = timeValue.trim();
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate) ||
    !/^\d{2}:\d{2}$/.test(trimmedTime)
  ) {
    return null;
  }
  const parsed = new Date(`${trimmedDate}T${trimmedTime}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const timePartsFromValue = (value: string) => {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  const hour24 = match ? Number(match[1]) : 10;
  const minute = match ? match[2] : "00";
  return {
    hour: String(((hour24 + 11) % 12) + 1),
    minute,
    period: hour24 >= 12 ? "PM" : "AM",
  };
};

const timeValueFromParts = (
  hourValue: string,
  minuteValue: string,
  periodValue: string,
) => {
  const hour12 = Number(hourValue);
  const hour24 =
    periodValue === "PM"
      ? hour12 === 12
        ? 12
        : hour12 + 12
      : hour12 === 12
        ? 0
        : hour12;
  return `${String(hour24).padStart(2, "0")}:${minuteValue}`;
};

const EventFormScreen = ({ navigation, route }: any) => {
  const eventId = route.params?.eventId as string | undefined;
  const [category, setCategory] = useState<EventCategory>("meeting");
  const [status, setStatus] = useState<EventStatus>("published");
  const [dayReminderEnabled, setDayReminderEnabled] = useState(true);
  const [hourReminderEnabled, setHourReminderEnabled] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(eventId));
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuthStore();
  const upsertEvent = useEventsStore((state) => state.upsertEvent);
  const admin = isAdmin(user);
  const { control, handleSubmit, reset, formState } = useForm<FormValues>({
    defaultValues: {
      title: "",
      description: "",
      date: format(new Date(), "yyyy-MM-dd"),
      time: "10:00",
      location: "",
      meetingLink: "",
      capacity: "0",
    },
  });

  useEffect(() => {
    if (!admin || !eventId) {
      return;
    }
    getEvent(eventId)
      .then((event) => {
        reset({
          title: event.title,
          description: event.description,
          date: format(event.dateTime, "yyyy-MM-dd"),
          time: format(event.dateTime, "HH:mm"),
          location: event.location,
          meetingLink: event.meetingLink ?? "",
          capacity: String(event.capacity),
        });
        setCategory(event.category);
        setStatus(event.status);
        setDayReminderEnabled(event.dayReminderEnabled);
        setHourReminderEnabled(event.hourReminderEnabled);
      })
      .catch((error) =>
        setLoadError(
          error instanceof Error ? error.message : "Could not load this event.",
        ),
      )
      .finally(() => setLoading(false));
  }, [admin, eventId, reset]);

  const onSubmit = async (values: FormValues) => {
    if (submitting) {
      return;
    }
    const dateTime = parseDateTime(values.date, values.time);
    if (!dateTime) {
      Alert.alert(
        "Date required",
        "Use date format YYYY-MM-DD and time format HH:mm.",
      );
      return;
    }
    const capacity = Number(values.capacity);
    if (!Number.isInteger(capacity) || capacity < 0) {
      Alert.alert(
        "Capacity required",
        "Capacity must be zero or a positive whole number.",
      );
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
        meetingLink: values.meetingLink.trim() || null,
        capacity,
        status,
        dayReminderEnabled,
        hourReminderEnabled,
      };
      let savedEvent;
      if (eventId) {
        savedEvent = await updateEvent(eventId, payload);
      } else {
        savedEvent = await createEvent(payload);
      }
      upsertEvent(savedEvent);
      safeGoBack(navigation, "EventsList");
    } catch (error) {
      Alert.alert(
        "Event not saved",
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
          title="Event"
          showBack
          onBack={() => safeGoBack(navigation, "EventsList")}
        />
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

  if (loadError) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Event"
          showBack
          onBack={() => safeGoBack(navigation, "EventsList")}
        />
        <EmptyState
          icon="!"
          title="Event unavailable"
          message={loadError}
          actionLabel="Back to Events"
          onAction={() => safeGoBack(navigation, "EventsList")}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title={eventId ? "Edit Event" : "New Event"}
        showBack
        onBack={() => safeGoBack(navigation, "EventsList")}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Field
            control={control}
            error={formState.errors.title?.message}
            label="TITLE"
            name="title"
            rules={{ required: "Title is required." }}
          />
          <Field
            control={control}
            error={formState.errors.description?.message}
            label="DESCRIPTION"
            multiline
            name="description"
            rules={{ required: "Description is required." }}
          />
          <Text style={styles.sectionLabel}>CATEGORY</Text>
          <ChipRow
            options={categoryOptions}
            selectedValue={category}
            onChange={setCategory}
          />
          <View style={styles.dateTimeStack}>
            <Controller
              control={control}
              name="date"
              rules={{
                required: "Date is required.",
                pattern: {
                  value: /^\d{4}-\d{2}-\d{2}$/,
                  message: "Use YYYY-MM-DD.",
                },
              }}
              render={({ field: { onChange, value } }) => (
                <CalendarDateField
                  value={value}
                  onChange={onChange}
                  label="DATE"
                  error={formState.errors.date?.message}
                  style={styles.field}
                />
              )}
            />
            <Controller
              control={control}
              name="time"
              rules={{ required: "Time is required." }}
              render={({ field: { onChange, value } }) => (
                <TimeDropdown
                  value={value}
                  onChange={onChange}
                  error={formState.errors.time?.message}
                />
              )}
            />
          </View>
          <Field
            control={control}
            error={formState.errors.location?.message}
            label="LOCATION"
            name="location"
            rules={{
              validate: (value: string, values: FormValues) =>
                Boolean(value.trim()) ||
                isValidMeetingLink(values.meetingLink) ||
                "Enter a location or add a meeting link below.",
            }}
          />
          <Text style={styles.helpText}>
            Optional. Write in a physical address for in-person events.
          </Text>
          <Field
            control={control}
            error={formState.errors.meetingLink?.message}
            keyboardType="url"
            label="MEETING LINK"
            name="meetingLink"
            rules={{
              deps: ["location"],
              validate: (value: string) =>
                !value.trim() ||
                isValidMeetingLink(value) ||
                "Enter a valid https:// meeting link.",
            }}
          />
          <Text style={styles.helpText}>
            Optional. Paste a Google Meet, Zoom, or Teams link for online
            events.
          </Text>
          <Field
            control={control}
            error={formState.errors.capacity?.message}
            keyboardType="numeric"
            label="CAPACITY"
            name="capacity"
            rules={{
              required: "Capacity is required.",
              pattern: {
                value: /^\d+$/,
                message: "Use whole numbers only.",
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
          <Text style={styles.sectionLabel}>REMINDERS</Text>
          <ReminderToggleRow
            label="Day-before reminder"
            helper="Notify members 24 hours before the event."
            value={dayReminderEnabled}
            onValueChange={setDayReminderEnabled}
          />
          <ReminderToggleRow
            label="One-hour reminder"
            helper="Notify members about 1 hour before the event."
            value={hourReminderEnabled}
            onValueChange={setHourReminderEnabled}
          />
          <GoldButton
            label={eventId ? "Save Event" : "Create Event"}
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

const ReminderToggleRow = ({
  helper,
  label,
  onValueChange,
  value,
}: {
  helper: string;
  label: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
}) => (
  <View style={styles.reminderCard}>
    <View style={styles.reminderTextWrap}>
      <Text style={styles.reminderLabel}>{label}</Text>
      <Text style={styles.reminderHelp}>{helper}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.bg.elevated, true: colors.gold.dark }}
      thumbColor={colors.bg.secondary}
    />
  </View>
);

const TimeDropdown = ({
  error,
  onChange,
  value,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const parts = timePartsFromValue(value);
  const resolvedMinuteOptions = minuteOptions.some(
    (option) => option.value === parts.minute,
  )
    ? minuteOptions
    : [...minuteOptions, { label: parts.minute, value: parts.minute }].sort(
        (left, right) => Number(left.value) - Number(right.value),
      );
  const updatePart = (next: Partial<typeof parts>) => {
    const merged = { ...parts, ...next };
    onChange(timeValueFromParts(merged.hour, merged.minute, merged.period));
  };
  const timeLabel = `${parts.hour}:${parts.minute} ${parts.period}`;

  return (
    <View style={styles.timeField}>
      <Text style={styles.label}>TIME</Text>
      <TouchableOpacity
        style={[styles.timePickerButton, error && styles.inputError]}
        onPress={() => setPickerOpen(true)}
        activeOpacity={0.86}
      >
        <View style={styles.timePickerCopy}>
          <Text style={styles.timePickerValue}>{timeLabel}</Text>
          <Text style={styles.timePickerHelp}>Tap to choose time</Text>
        </View>
        <Text style={styles.timePickerChevron}>v</Text>
      </TouchableOpacity>
      <Modal
        animationType="fade"
        transparent
        visible={pickerOpen}
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.timeModalBackdrop}>
          <View style={styles.timeModalCard}>
            <View style={styles.timeModalHeader}>
              <View style={styles.timeModalTitleWrap}>
                <Text style={styles.timeModalTitle}>Choose time</Text>
                <Text style={styles.timeModalSubtitle}>{timeLabel}</Text>
              </View>
              <TouchableOpacity
                style={styles.timeModalClose}
                onPress={() => setPickerOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.timeModalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.periodRow}>
              {periodOptions.map((option) => {
                const selected = parts.period === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.periodChip,
                      selected && styles.periodChipSelected,
                    ]}
                    onPress={() => updatePart({ period: option.value })}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.periodChipText,
                        selected && styles.periodChipTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.timePickerColumns}>
              <TimeOptionColumn
                label="Hour"
                options={hourOptions}
                value={parts.hour}
                onChange={(hour) => updatePart({ hour })}
              />
              <TimeOptionColumn
                label="Minute"
                options={resolvedMinuteOptions}
                value={parts.minute}
                onChange={(minute) => updatePart({ minute })}
              />
            </View>
            <GoldButton
              label="Done"
              onPress={() => setPickerOpen(false)}
              fullWidth
            />
          </View>
        </View>
      </Modal>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const TimeOptionColumn = <T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) => (
  <View style={styles.timeOptionColumn}>
    <Text style={styles.timeOptionColumnLabel}>{label}</Text>
    <ScrollView
      style={styles.timeOptionList}
      contentContainerStyle={styles.timeOptionListContent}
      showsVerticalScrollIndicator={false}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.timeOption, selected && styles.timeOptionSelected]}
            onPress={() => onChange(option.value)}
            activeOpacity={0.82}
          >
            <Text
              style={[
                styles.timeOptionText,
                selected && styles.timeOptionTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  field: { flex: 1, gap: spacing.xs },
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
  reminderCard: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  reminderTextWrap: { flex: 1, gap: spacing.xs },
  reminderLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  reminderHelp: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    lineHeight: typography.size.xs * typography.lineHeight.normal,
  },
  dateTimeStack: { gap: spacing.md },
  timeField: { gap: spacing.xs },
  timePickerButton: {
    minHeight: 64,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.tertiary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  timePickerCopy: { flex: 1, gap: 2 },
  timePickerValue: {
    flex: 1,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  timePickerHelp: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
  },
  timePickerChevron: {
    fontSize: typography.size.xs,
    color: colors.gold.light,
  },
  timeModalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    padding: spacing.lg,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
  },
  timeModalCard: {
    maxHeight: "78%",
    padding: spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
    gap: spacing.md,
  },
  timeModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  timeModalTitleWrap: { flex: 1, gap: spacing.xs },
  timeModalTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  timeModalSubtitle: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  timeModalClose: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: colors.bg.elevated,
  },
  timeModalCloseText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.gold.light,
  },
  periodRow: { flexDirection: "row", gap: spacing.sm },
  periodChip: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.tertiary,
  },
  periodChipSelected: {
    borderColor: colors.gold.default,
    backgroundColor: `${colors.gold.default}22`,
  },
  periodChipText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.text.secondary,
  },
  periodChipTextSelected: { color: colors.gold.light },
  timePickerColumns: { flexDirection: "row", gap: spacing.md },
  timeOptionColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  timeOptionColumnLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.text.secondary,
    letterSpacing: 0.8,
  },
  timeOptionList: {
    maxHeight: 270,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.tertiary,
  },
  timeOptionListContent: { padding: spacing.xs, gap: spacing.xs },
  timeOption: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  timeOptionSelected: { backgroundColor: `${colors.gold.default}22` },
  timeOptionText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },
  timeOptionTextSelected: { color: colors.gold.light },
  helpText: { fontSize: typography.size.xs, color: colors.text.tertiary },
});

export default EventFormScreen;
