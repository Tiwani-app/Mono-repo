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
import { Controller, useForm } from "react-hook-form";
import { SafeAreaView } from "react-native-safe-area-context";
import EmptyState from "../../components/common/EmptyState";
import GoldButton from "../../components/common/GoldButton";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ScreenHeader from "../../components/common/ScreenHeader";
import {
  createListing,
  getListing,
  updateListing,
} from "../../services/marketplaceService";
import { useAuthStore } from "../../store/authStore";
import { colors, spacing, typography } from "../../theme";
import {
  ListingCondition,
  ListingStatus,
} from "../../types/marketplace";
import { isAdmin } from "../../utils/roleGuard";

interface FormValues {
  title: string;
  price: string;
  description: string;
  contactInstruction: string;
  imageURL: string;
}

const conditionOptions: { label: string; value: ListingCondition }[] = [
  { label: "New", value: "new" },
  { label: "Like New", value: "like_new" },
  { label: "Good", value: "good" },
  { label: "Fair", value: "fair" },
  { label: "Used", value: "used" },
];

const statusOptions: { label: string; value: ListingStatus }[] = [
  { label: "Available", value: "available" },
  { label: "Sold", value: "sold" },
];

const ListingFormScreen = ({ navigation, route }: any) => {
  const listingId = route.params?.listingId as string | undefined;
  const [condition, setCondition] = useState<ListingCondition>("good");
  const [status, setStatus] = useState<ListingStatus>("available");
  const [loading, setLoading] = useState(Boolean(listingId));
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuthStore();
  const { control, handleSubmit, reset, formState } = useForm<FormValues>({
    defaultValues: {
      title: "",
      price: "",
      description: "",
      contactInstruction: "WhatsApp the seller to arrange inspection and pickup.",
      imageURL: "",
    },
  });

  useEffect(() => {
    if (!listingId) {
      return;
    }
    getListing(listingId)
      .then((listing) => {
        reset({
          title: listing.title,
          price: String(listing.price),
          description: listing.description,
          contactInstruction: listing.contactInstruction,
          imageURL: listing.imageURL ?? "",
        });
        setCondition(listing.condition);
        setStatus(listing.status);
      })
      .catch(() => Alert.alert("Marketplace", "Could not load this listing."))
      .finally(() => setLoading(false));
  }, [listingId, reset]);

  const onSubmit = async (values: FormValues) => {
    const price = Number(values.price.replace(/,/g, ""));
    if (!Number.isFinite(price) || price <= 0) {
      Alert.alert("Price required", "Enter a price greater than zero.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: values.title.trim(),
        price,
        description: values.description.trim(),
        condition,
        status,
        imageURL: values.imageURL.trim() || null,
        contactInstruction: values.contactInstruction.trim(),
      };
      if (listingId) {
        await updateListing(listingId, payload);
      } else {
        await createListing(payload);
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert(
        "Listing not saved",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdmin(user)) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Listing" showBack onBack={navigation.goBack} />
        <EmptyState
          icon="!"
          title="Admin only"
          message="Only admins can create and edit marketplace listings."
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
        title={listingId ? "Edit Listing" : "Add Listing"}
        showBack
        onBack={navigation.goBack}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Field
            control={control}
            error={formState.errors.title?.message}
            label="TITLE"
            name="title"
            rules={{ required: "Title is required." }}
          />
          <Field
            control={control}
            error={formState.errors.price?.message}
            keyboardType="numeric"
            label="PRICE"
            name="price"
            rules={{
              required: "Price is required.",
              pattern: {
                value: /^[0-9,]+$/,
                message: "Use numbers only.",
              },
            }}
          />
          <Field
            control={control}
            error={formState.errors.description?.message}
            label="DESCRIPTION"
            multiline
            name="description"
            rules={{ required: "Description is required." }}
          />
          <Text style={styles.sectionLabel}>CONDITION</Text>
          <ChipRow
            options={conditionOptions}
            selectedValue={condition}
            onChange={setCondition}
          />
          <Text style={styles.sectionLabel}>STATUS</Text>
          <ChipRow
            options={statusOptions}
            selectedValue={status}
            onChange={setStatus}
          />
          <Field
            control={control}
            error={formState.errors.contactInstruction?.message}
            label="CONTACT INSTRUCTION"
            multiline
            name="contactInstruction"
            rules={{ required: "Contact instruction is required." }}
          />
          <Field
            control={control}
            error={formState.errors.imageURL?.message}
            label="IMAGE URL"
            name="imageURL"
          />
          <View style={styles.uploadFallback}>
            <Text style={styles.uploadTitle}>Image picker fallback</Text>
            <Text style={styles.uploadText}>
              Use an image URL for now. Device image selection can be wired once
              storage endpoints are available.
            </Text>
          </View>
          <GoldButton
            label={listingId ? "Save Listing" : "Create Listing"}
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
  uploadFallback: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  uploadTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  uploadText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    lineHeight: 18,
  },
});

export default ListingFormScreen;
