import React, { useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "./FeatherIcon";
import { colors, spacing, typography } from "../../theme";

interface Props {
  error?: string;
  fileName?: string | null;
  helperText?: string;
  keyboardType?: "default" | "url";
  label: string;
  mode: "document" | "image";
  onChangeText: (value: string) => void;
  onPick?: () => void;
  placeholder?: string;
  value?: string | null;
}

const iconForMode = (mode: Props["mode"]) =>
  mode === "image" ? "image" : "file-text";

const AttachmentField = ({
  error,
  fileName,
  helperText,
  keyboardType = "url",
  label,
  mode,
  onChangeText,
  onPick,
  placeholder,
  value,
}: Props) => {
  const [imageFailed, setImageFailed] = useState(false);
  const trimmedValue = value?.trim() ?? "";
  const showImage = mode === "image" && trimmedValue && !imageFailed;

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.slot, error && styles.slotError]}>
        <View style={styles.preview}>
          {showImage ? (
            <Image
              source={{ uri: trimmedValue }}
              style={styles.image}
              resizeMode="cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <Icon
              name={iconForMode(mode)}
              size={26}
              color={colors.gold.light}
            />
          )}
        </View>
        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={1}>
            {fileName?.trim() ||
              (mode === "image" ? "Image attachment" : "Document attachment")}
          </Text>
          <Text style={styles.helper}>{helperText}</Text>
        </View>
        {onPick && (
          <TouchableOpacity
            style={styles.pickButton}
            onPress={onPick}
            activeOpacity={0.8}
          >
            <Icon name="upload" size={16} color={colors.gold.default} />
          </TouchableOpacity>
        )}
      </View>
      <TextInput
        value={value ?? ""}
        onChangeText={(nextValue) => {
          setImageFailed(false);
          onChangeText(nextValue);
        }}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === "url" ? "none" : undefined}
        placeholder={placeholder}
        placeholderTextColor={colors.text.tertiary}
        style={[styles.input, error && styles.inputError]}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  label: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  slot: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.gold.dark,
    backgroundColor: colors.bg.card,
  },
  slotError: { borderColor: colors.status.error },
  preview: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: colors.bg.elevated,
  },
  image: { width: "100%", height: "100%" },
  copy: { flex: 1, gap: spacing.xs },
  title: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  helper: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    lineHeight: 16,
  },
  pickButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.tertiary,
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
});

export default AttachmentField;
