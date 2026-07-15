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
import { addDays, endOfDay, format, parse } from "date-fns";
import { SafeAreaView } from "react-native-safe-area-context";
import AttachmentField from "../../components/common/AttachmentField";
import CalendarDateField from "../../components/common/CalendarDateField";
import EmptyState from "../../components/common/EmptyState";
import FeedbackModal, { FeedbackModalType } from "../../components/common/FeedbackModal";
import Icon from "../../components/common/FeatherIcon";
import GoldButton from "../../components/common/GoldButton";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import OutlineButton from "../../components/common/OutlineButton";
import ScreenHeader from "../../components/common/ScreenHeader";
import {
  createPoll,
  getPoll,
  updatePoll,
  uploadVotingImage,
} from "../../services/votingService";
import { pickResizedImage } from "../../utils/imagePicker";
import { useAuthStore } from "../../store/authStore";
import { colors, spacing, typography } from "../../theme";
import { Poll } from "../../types/voting";
import { safeGoBack } from "../../utils/navigation";
import { isAdmin } from "../../utils/roleGuard";

interface FormValues {
  title: string;
  question: string;
  expiresAt: string;
  options: { label: string; imageURL: string }[];
}

const statusOptions: { label: string; value: Poll["status"] }[] = [
  { label: "Draft", value: "draft" },
  { label: "Open", value: "open" },
];

const PollFormScreen = ({ navigation, route }: any) => {
  const pollId = route.params?.pollId as string | undefined;
  const [status, setStatus] = useState<Poll["status"]>("open");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(pollId));
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImageIndex, setUploadingImageIndex] = useState<number | null>(
    null,
  );
  const { user } = useAuthStore();
  const admin = isAdmin(user);
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
  const { control, handleSubmit, reset, formState, setValue } =
    useForm<FormValues>({
      defaultValues: {
        title: "",
        question: "",
        expiresAt: format(addDays(new Date(), 7), "yyyy-MM-dd"),
        options: [
          { label: "", imageURL: "" },
          { label: "", imageURL: "" },
        ],
      },
    });
  const { append, fields, remove } = useFieldArray({
    control,
    name: "options",
  });

  useEffect(() => {
    if (!admin || !pollId) {
      return;
    }
    getPoll(pollId)
      .then((poll) => {
        reset({
          title: poll.title,
          question: poll.question,
          expiresAt: format(poll.expiresAt ?? addDays(new Date(), 7), "yyyy-MM-dd"),
          options: poll.options.map((option) => ({
            label: option.label,
            imageURL: option.imageURL ?? "",
          })),
        });
        setStatus(poll.status);
      })
      .catch((error) =>
        setLoadError(
          error instanceof Error ? error.message : "Could not load this poll.",
        ),
      )
      .finally(() => setLoading(false));
  }, [admin, pollId, reset]);

  const handlePickOptionImage = async (index: number) => {
    if (uploadingImageIndex !== null) {
      return;
    }
    try {
      const picked = await pickResizedImage();
      if (!picked) {
        return;
      }
      setUploadingImageIndex(index);
      const imageURL = await uploadVotingImage(picked);
      setValue(`options.${index}.imageURL`, imageURL, { shouldDirty: true });
    } catch (error) {
      Alert.alert(
        "Image not uploaded",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setUploadingImageIndex(null);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (submitting) {
      return;
    }
    const seenLabels = new Set<string>();
    const options = values.options
      .map((option) => ({
        label: option.label.trim(),
        imageURL: option.imageURL.trim() || null,
      }))
      .filter((option) => {
        if (!option.label || seenLabels.has(option.label)) {
          return false;
        }
        seenLabels.add(option.label);
        return true;
      });
    if (options.length < 2) {
      setModal({ visible: true, type: "error", title: "Options required", message: "Add at least two unique options.", onPrimary: closeModal });
      return;
    }
    const expiryDate = parse(values.expiresAt, "yyyy-MM-dd", new Date());
    const expiresAt = endOfDay(expiryDate);
    if (Number.isNaN(expiresAt.getTime())) {
      setModal({ visible: true, type: "error", title: "Expiry date required", message: "Choose a valid expiry date.", onPrimary: closeModal });
      return;
    }
    if (status === "open" && expiresAt.getTime() <= Date.now()) {
      setModal({ visible: true, type: "error", title: "Expiry date required", message: "Open polls need an expiry date in the future.", onPrimary: closeModal });
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: values.title.trim(),
        question: values.question.trim(),
        status,
        expiresAt,
        options,
      };
      if (pollId) {
        await updatePoll(pollId, payload);
      } else {
        await createPoll(payload);
      }
      safeGoBack(navigation, "VotingHub");
    } catch (error) {
      setModal({ visible: true, type: "error", title: "Poll not saved", message: error instanceof Error ? error.message : "Please try again.", onPrimary: closeModal });
    } finally {
      setSubmitting(false);
    }
  };

  if (!admin) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Poll"
          showBack
          onBack={() => safeGoBack(navigation, "VotingHub")}
        />
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
        <ScreenHeader
          title="Poll"
          showBack
          onBack={() => safeGoBack(navigation, "VotingHub")}
        />
        <EmptyState
          icon="!"
          title="Poll unavailable"
          message={loadError}
          actionLabel="Back to Voting"
          onAction={() => safeGoBack(navigation, "VotingHub")}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
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
        title={pollId ? "Edit Poll" : "New Poll"}
        showBack
        onBack={() => safeGoBack(navigation, "VotingHub")}
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
            error={formState.errors.question?.message}
            label="QUESTION"
            multiline
            name="question"
            rules={{ required: "Question is required." }}
          />
          <Text style={styles.sectionLabel}>OPTIONS</Text>
          {fields.map((field, index) => (
            <View key={field.id} style={styles.optionCard}>
              <View style={styles.optionRow}>
                <View style={styles.optionInput}>
                  <Field
                    control={control}
                    error={formState.errors.options?.[index]?.label?.message}
                    label={`OPTION ${index + 1}`}
                    name={`options.${index}.label`}
                    rules={{
                      required: index < 2 ? "Option is required." : false,
                    }}
                  />
                </View>
                {fields.length > 2 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => remove(index)}
                    activeOpacity={0.8}
                  >
                    <Icon name="trash-2" size={18} color={colors.status.error} />
                  </TouchableOpacity>
                )}
              </View>
              <Controller
                control={control}
                name={`options.${index}.imageURL`}
                render={({ field: { onChange, value } }) => (
                  <View style={styles.imageField}>
                    <AttachmentField
                      label="OPTION IMAGE (OPTIONAL)"
                      mode="image"
                      fileName={value ? `Option ${index + 1} image` : null}
                      value={value}
                      onChangeText={onChange}
                      showUrlInput={false}
                      helperText={
                        uploadingImageIndex === index
                          ? "Uploading image..."
                          : "Optional image shown with this option."
                      }
                      onPick={() => handlePickOptionImage(index)}
                    />
                    {Boolean(value) && (
                      <OutlineButton
                        label="Remove Image"
                        color={colors.status.error}
                        onPress={() => onChange("")}
                        disabled={uploadingImageIndex !== null}
                        fullWidth
                      />
                    )}
                  </View>
                )}
              />
            </View>
          ))}
          <OutlineButton
            label="Add Option"
            onPress={() => append({ label: "", imageURL: "" })}
            fullWidth
          />
          <Text style={styles.sectionLabel}>STATUS</Text>
          <ChipRow
            options={statusOptions}
            selectedValue={status}
            onChange={setStatus}
          />
          <Controller
            control={control}
            name="expiresAt"
            rules={{
              required: "Expiry date is required.",
              pattern: {
                value: /^\d{4}-\d{2}-\d{2}$/,
                message: "Use YYYY-MM-DD.",
              },
            }}
            render={({ field: { onChange, value } }) => (
              <CalendarDateField
                value={value}
                onChange={onChange}
                label="EXPIRY DATE"
                error={formState.errors.expiresAt?.message}
              />
            )}
          />
          <GoldButton
            label={pollId ? "Save Poll" : "Create Poll"}
            onPress={handleSubmit(onSubmit)}
            loading={submitting}
            fullWidth
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const Field = ({ control, error, label, multiline, name, rules }: any) => (
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  field: { gap: spacing.xs },
  imageField: { gap: spacing.sm },
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
  optionCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  optionInput: { flex: 1 },
  removeButton: {
    width: 48,
    height: 48,
    marginTop: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: `${colors.status.error}14`,
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
});

export default PollFormScreen;
