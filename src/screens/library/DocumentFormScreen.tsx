import React, { useEffect, useMemo, useState } from "react";
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
import { Controller, useForm } from "react-hook-form";
import { SafeAreaView } from "react-native-safe-area-context";
import GoldButton from "../../components/common/GoldButton";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ScreenHeader from "../../components/common/ScreenHeader";
import DocumentUploadField from "../../components/library/DocumentUploadField";
import {
  createLibraryDocument,
  getLibraryDocument,
  updateLibraryDocument,
} from "../../services/libraryService";
import { colors, spacing, typography } from "../../theme";
import {
  LIBRARY_CATEGORY_LABELS,
  LIBRARY_TYPE_LABELS,
  LibraryCategory,
  LibraryDocumentStatus,
  LibraryDocumentType,
  LibraryDocumentVisibility,
} from "../../types/library";
import { safeGoBack } from "../../utils/navigation";

interface FormValues {
  title: string;
  description: string;
  fileName: string;
}

const typeOptionsByCategory: Record<LibraryCategory, LibraryDocumentType[]> = {
  constitutional: [
    "constitution",
    "by_laws",
    "rules_regulations",
    "code_of_conduct",
    "other",
  ],
  minutes_reports: [
    "meeting_minutes",
    "financial_report",
    "committee_report",
    "other",
  ],
};

const DocumentFormScreen = ({ navigation, route }: any) => {
  const documentId = route.params?.documentId as string | undefined;
  const [category, setCategory] = useState<LibraryCategory>("constitutional");
  const [type, setType] = useState<LibraryDocumentType>("constitution");
  const [status, setStatus] = useState<LibraryDocumentStatus>("draft");
  const [visibility, setVisibility] =
    useState<LibraryDocumentVisibility>("all_members");
  const [loading, setLoading] = useState(Boolean(documentId));
  const [submitting, setSubmitting] = useState(false);
  const { control, handleSubmit, reset, watch, formState } = useForm<FormValues>({
    defaultValues: {
      title: "",
      description: "",
      fileName: "association-document.pdf",
    },
  });

  useEffect(() => {
    if (!documentId) {
      return;
    }
    getLibraryDocument(documentId)
      .then((document) => {
        reset({
          title: document.title,
          description: document.description,
          fileName: document.fileName,
        });
        setCategory(document.category);
        setType(document.type);
        setStatus(document.status);
        setVisibility(document.visibility);
      })
      .catch(() => Alert.alert("Library", "Could not load this document."))
      .finally(() => setLoading(false));
  }, [documentId, reset]);

  const typeOptions = useMemo(() => typeOptionsByCategory[category], [category]);

  const handleCategoryChange = (nextCategory: LibraryCategory) => {
    setCategory(nextCategory);
    setType(typeOptionsByCategory[nextCategory][0]);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      setSubmitting(true);
      if (documentId) {
        await updateLibraryDocument(documentId, {
          title: values.title,
          description: values.description,
          fileName: values.fileName,
          category,
          type,
          status,
          visibility,
        });
      } else {
        await createLibraryDocument({
          title: values.title,
          description: values.description,
          fileName: values.fileName,
          category,
          type,
          status,
          visibility,
          documentDate: new Date(),
          fileURL: null,
          fileType: values.fileName.toLowerCase().endsWith(".pdf")
            ? "pdf"
            : "other",
          fileSize: null,
        });
      }
      safeGoBack(navigation, "Library");
    } catch (error) {
      Alert.alert(
        "Document not saved",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title={documentId ? "Edit Document" : "Upload Document"}
        showBack
        onBack={() => safeGoBack(navigation, "Library")}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <DocumentUploadField fileName={watch("fileName")} />
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
          <Field
            control={control}
            error={formState.errors.fileName?.message}
            label="FILE NAME"
            name="fileName"
            rules={{ required: "File name is required." }}
          />
          <Text style={styles.sectionLabel}>CATEGORY</Text>
          <ChipRow
            options={[
              { label: LIBRARY_CATEGORY_LABELS.constitutional, value: "constitutional" },
              { label: LIBRARY_CATEGORY_LABELS.minutes_reports, value: "minutes_reports" },
            ]}
            selectedValue={category}
            onChange={handleCategoryChange}
          />
          <Text style={styles.sectionLabel}>DOCUMENT TYPE</Text>
          <ChipRow
            options={typeOptions.map((item) => ({
              label: LIBRARY_TYPE_LABELS[item],
              value: item,
            }))}
            selectedValue={type}
            onChange={setType}
          />
          <Text style={styles.sectionLabel}>STATUS</Text>
          <ChipRow
            options={[
              { label: "Draft", value: "draft" },
              { label: "Published", value: "published" },
              { label: "Archived", value: "archived" },
            ]}
            selectedValue={status}
            onChange={setStatus}
          />
          <Text style={styles.sectionLabel}>VISIBILITY</Text>
          <ChipRow
            options={[
              { label: "All Members", value: "all_members" },
              { label: "Admin Only", value: "admin_only" },
            ]}
            selectedValue={visibility}
            onChange={setVisibility}
          />
          <GoldButton
            label={documentId ? "Save Document" : "Create Document"}
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
      const selected = option.value === selectedValue;
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
});

export default DocumentFormScreen;
