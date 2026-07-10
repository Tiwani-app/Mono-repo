import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import EmptyState from "../../components/common/EmptyState";
import FeedbackModal, { FeedbackModalType } from "../../components/common/FeedbackModal";
import GoldButton from "../../components/common/GoldButton";
import ScreenHeader from "../../components/common/ScreenHeader";
import { sendAnnouncement } from "../../services/notificationsService";
import { useAuthStore } from "../../store/authStore";
import { colors, spacing, typography } from "../../theme";
import { NotificationType } from "../../types/notification";
import { safeGoBack } from "../../utils/navigation";
import { isAdmin } from "../../utils/roleGuard";

const typeOptions: { label: string; value: NotificationType }[] = [
  { label: "General", value: "general" },
  { label: "Event", value: "event" },
  { label: "Finance", value: "finance" },
  { label: "Vote", value: "vote" },
  { label: "Market", value: "marketplace" },
];

const AnnouncementFormScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<NotificationType>("general");
  const [submitting, setSubmitting] = useState(false);
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

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle || !trimmedBody) {
      setModal({ visible: true, type: "error", title: "Announcement required", message: "Enter a title and message.", onPrimary: closeModal });
      return;
    }

    try {
      setSubmitting(true);
      await sendAnnouncement({
        title: trimmedTitle,
        body: trimmedBody,
        type,
      });
      setModal({
        visible: true,
        type: "success",
        title: "Announcement saved",
        message: "Saved to every member's in-app inbox.",
        primaryLabel: "OK",
        onPrimary: () => { closeModal(); safeGoBack(navigation, "Notifications"); },
      });
    } catch (error) {
      setModal({ visible: true, type: "error", title: "Announcement not sent", message: error instanceof Error ? error.message : "Please try again.", onPrimary: closeModal });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdmin(user)) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Send Announcement"
          showBack
          onBack={() => safeGoBack(navigation, "Notifications")}
        />
        <EmptyState
          icon="!"
          title="Admin only"
          message="Only admins can send announcements."
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
        title="Send Announcement"
        showBack
        onBack={() => safeGoBack(navigation, "Notifications")}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.field}>
            <Text style={styles.label}>TITLE</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Announcement title"
              placeholderTextColor={colors.text.tertiary}
              style={styles.input}
              maxLength={120}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>MESSAGE</Text>
            <TextInput
              value={body}
              onChangeText={setBody}
              multiline
              placeholder="Write a message for all members"
              placeholderTextColor={colors.text.tertiary}
              style={[styles.input, styles.textArea]}
              maxLength={1000}
            />
          </View>
          <Text style={styles.label}>CATEGORY</Text>
          <View style={styles.chipRow}>
            {typeOptions.map((option) => {
              const selected = option.value === type;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.chip, selected && styles.selectedChip]}
                  onPress={() => setType(option.value)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selected && styles.selectedChipText,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.helper}>
            This announcement will appear in every member's in-app inbox.
          </Text>
          <GoldButton
            label="Save Announcement"
            onPress={handleSubmit}
            loading={submitting}
            fullWidth
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

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
  textArea: { minHeight: 128, textAlignVertical: "top" },
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
  helper: {
    fontSize: typography.size.sm,
    lineHeight: 18,
    color: colors.text.tertiary,
  },
});

export default AnnouncementFormScreen;
