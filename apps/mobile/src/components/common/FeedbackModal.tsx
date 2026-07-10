import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { colors, spacing, typography } from "../../theme";

export type FeedbackModalType = "success" | "error" | "warning" | "info";

interface FeedbackModalProps {
  visible: boolean;
  type: FeedbackModalType;
  title: string;
  message: string;
  primaryLabel?: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

const iconFor = (type: FeedbackModalType) => {
  if (type === "success") return "✓";
  if (type === "warning") return "!";
  if (type === "info") return "i";
  return "✕";
};

const FeedbackModal = ({
  visible,
  type,
  title,
  message,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: FeedbackModalProps) => {
  const resolvedPrimaryLabel =
    primaryLabel ?? (type === "success" ? "Done" : "OK");
  const dismissOnOverlay = type === "error" || type === "info";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <TouchableWithoutFeedback
        onPress={dismissOnOverlay ? onPrimary : undefined}
      >
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              <View style={[styles.iconCircle, styles[`iconCircle_${type}`]]}>
                <Text style={[styles.iconText, styles[`iconText_${type}`]]}>
                  {iconFor(type)}
                </Text>
              </View>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>
              <View style={styles.actions}>
                {secondaryLabel && onSecondary && (
                  <TouchableOpacity
                    style={[styles.btn, styles.btnSecondary]}
                    onPress={onSecondary}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.btnSecondaryLabel}>{secondaryLabel}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.btn,
                    styles[`btnPrimary_${type}`],
                    secondaryLabel && onSecondary
                      ? styles.btnFlex
                      : styles.btnFull,
                  ]}
                  onPress={onPrimary}
                  activeOpacity={0.8}
                >
                  <Text style={styles.btnPrimaryLabel}>
                    {resolvedPrimaryLabel}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.bg.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing.xxl,
    alignItems: "center",
    gap: spacing.md,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  iconCircle_success: {
    backgroundColor: `${colors.status.success}20`,
    borderWidth: 2,
    borderColor: `${colors.status.success}60`,
  },
  iconCircle_error: {
    backgroundColor: `${colors.status.error}20`,
    borderWidth: 2,
    borderColor: `${colors.status.error}60`,
  },
  iconCircle_warning: {
    backgroundColor: `${colors.gold.default}20`,
    borderWidth: 2,
    borderColor: `${colors.gold.default}60`,
  },
  iconCircle_info: {
    backgroundColor: `${colors.status.info}20`,
    borderWidth: 2,
    borderColor: `${colors.status.info}60`,
  },
  iconText: {
    fontSize: 28,
    fontWeight: typography.weight.bold,
    lineHeight: 34,
  },
  iconText_success: { color: colors.status.success },
  iconText_error: { color: colors.status.error },
  iconText_warning: { color: colors.gold.light },
  iconText_info: { color: colors.status.info },
  title: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: "center",
  },
  message: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: 22,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
    width: "100%",
  },
  btn: {
    minHeight: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  btnFull: { flex: 1 },
  btnFlex: { flex: 1 },
  btnPrimary_success: { backgroundColor: colors.status.success },
  btnPrimary_error: { backgroundColor: colors.status.error },
  btnPrimary_warning: { backgroundColor: colors.gold.default },
  btnPrimary_info: { backgroundColor: colors.status.info },
  btnSecondary: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.tertiary,
  },
  btnPrimaryLabel: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.bg.primary,
  },
  btnSecondaryLabel: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },
});

export default FeedbackModal;
