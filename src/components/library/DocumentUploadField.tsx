import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Icon from "../common/FeatherIcon";
import { colors, spacing, typography } from "../../theme";

interface Props {
  fileName?: string | null;
}

const DocumentUploadField = ({ fileName }: Props) => (
  <View style={styles.box}>
    <Icon name="upload" size={20} color={colors.gold.light} />
    <Text style={styles.title}>{fileName ?? "Document upload"}</Text>
    <Text style={styles.subtitle}>
      Backend storage will provide file selection and upload handling.
    </Text>
  </View>
);

const styles = StyleSheet.create({
  box: {
    minHeight: 112,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.gold.dark,
    backgroundColor: colors.bg.card,
  },
  title: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: 18,
  },
});

export default DocumentUploadField;
