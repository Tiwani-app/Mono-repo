import React, { useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import GoldButton from "../../components/common/GoldButton";
import OutlineButton from "../../components/common/OutlineButton";
import ScreenHeader from "../../components/common/ScreenHeader";
import { env } from "../../config/env";
import { requestAccountDeletion } from "../../services/membersService";
import { signOut } from "../../services/authService";
import { colors, spacing, typography } from "../../theme";
import { safeGoBack } from "../../utils/navigation";

const AccountDeletionRequestScreen = ({ navigation }: any) => {
  const [confirmed, setConfirmed] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const openDeletionPage = async () => {
    const url = env.accountDeletionUrl.trim();
    if (!url) {
      Alert.alert(
        "Deletion page unavailable",
        "The public deletion request page has not been configured for this build yet.",
      );
      return;
    }
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert("Deletion page unavailable", "This link could not be opened.");
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert("Deletion page unavailable", "This link could not be opened.");
    }
  };

  const submitRequest = async () => {
    if (submitting) {
      return;
    }
    if (!confirmed) {
      Alert.alert(
        "Confirmation required",
        "Confirm that you understand this request will be reviewed before account data is deleted or anonymised.",
      );
      return;
    }

    try {
      setSubmitting(true);
      await requestAccountDeletion({ reason });
      Alert.alert(
        "Request submitted",
        "Your account deletion request has been recorded. An administrator will review it before any account data is removed.",
        [
          {
            text: "Sign Out",
            style: "destructive",
            onPress: signOut,
          },
          {
            text: "Back to Settings",
            onPress: () => safeGoBack(navigation, "Settings"),
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        "Request not submitted",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Account Deletion"
        showBack
        onBack={() => safeGoBack(navigation, "Settings")}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>Deletion requests are reviewed</Text>
          <Text style={styles.warningText}>
            Submitting this request does not immediately delete your account.
            Tiwani must preserve some finance, governance, and audit records
            where required, while removing or anonymising personal details that
            no longer need to be retained.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>REASON FOR REQUEST</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            multiline
            textAlignVertical="top"
            placeholder="Tell us why you want your account deleted."
            placeholderTextColor={colors.text.tertiary}
            style={styles.textArea}
          />
          <View style={styles.confirmRow}>
            <Text style={styles.confirmText}>
              I understand this request will be reviewed before my account data
              is deleted or anonymised.
            </Text>
            <Switch
              value={confirmed}
              onValueChange={setConfirmed}
              trackColor={{ false: colors.bg.elevated, true: colors.gold.dark }}
              thumbColor={colors.bg.secondary}
            />
          </View>
          <GoldButton
            label="Submit Request"
            onPress={submitRequest}
            loading={submitting}
            fullWidth
          />
          <OutlineButton
            label="Public Deletion Page"
            onPress={openDeletionPage}
            fullWidth
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  content: { padding: spacing.lg, gap: spacing.md },
  warningCard: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gold.dark,
    backgroundColor: colors.bg.card,
  },
  warningTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
  },
  warningText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
  formCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  label: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  textArea: {
    minHeight: 132,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.tertiary,
    color: colors.text.primary,
  },
  confirmRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.bg.tertiary,
  },
  confirmText: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
});

export default AccountDeletionRequestScreen;
