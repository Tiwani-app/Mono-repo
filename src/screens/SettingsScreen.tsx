import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Controller, useForm } from "react-hook-form";
import { SafeAreaView } from "react-native-safe-area-context";
import Avatar from "../components/common/Avatar";
import Badge from "../components/common/Badge";
import GoldButton from "../components/common/GoldButton";
import OutlineButton from "../components/common/OutlineButton";
import ScreenHeader from "../components/common/ScreenHeader";
import { signOut } from "../services/authService";
import { updateMemberProfile } from "../services/membersService";
import {
  PushRegistrationResult,
  requestPushPermissionAndRegister,
} from "../services/notificationsService";
import { useAuthStore } from "../store/authStore";
import { colors, spacing, typography } from "../theme";
import { NotificationPreferences } from "../types/user";
import { getInitials } from "../utils/getInitials";
import { safeGoBack } from "../utils/navigation";
import {
  ProfileFormValues,
  buildNotificationPreferences,
  buildProfileUpdate,
  getPreviousProfile,
} from "../utils/settingsProfile";

const SettingsScreen = ({ navigation }: any) => {
  const { updateCurrentUser, user } = useAuthStore();
  const [editingProfile, setEditingProfile] = useState(false);
  const [pushRegistration, setPushRegistration] =
    useState<PushRegistrationResult | null>(null);
  const [registeringPush, setRegisteringPush] = useState(false);
  const [savingPreference, setSavingPreference] = useState<
    keyof NotificationPreferences | null
  >(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const { control, handleSubmit, reset, formState } =
    useForm<ProfileFormValues>({
      values: {
        fullName: user?.fullName ?? "",
        phone: user?.phone ?? "",
        address: user?.address ?? "",
        photoURL: user?.photoURL ?? "",
      },
    });

  if (!user) {
    return null;
  }

  const handleToggleNotification = async (
    key: keyof NotificationPreferences,
    value: boolean,
  ) => {
    const previousPreferences = user.notificationPreferences;
    const notificationPreferences = buildNotificationPreferences(
      previousPreferences,
      key,
      value,
    );
    updateCurrentUser({ notificationPreferences });
    try {
      setSavingPreference(key);
      await updateMemberProfile(user.uid, { notificationPreferences });
    } catch (error) {
      updateCurrentUser({ notificationPreferences: previousPreferences });
      Alert.alert(
        "Preference not saved",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSavingPreference(null);
    }
  };

  const handleCancelEdit = () => {
    reset({
      fullName: user.fullName,
      phone: user.phone,
      address: user.address,
      photoURL: user.photoURL ?? "",
    });
    setEditingProfile(false);
  };

  const handleSaveProfile = async (values: ProfileFormValues) => {
    if (savingProfile) {
      return;
    }
    const previousProfile = getPreviousProfile(user);
    const update = buildProfileUpdate(values);
    try {
      setSavingProfile(true);
      updateCurrentUser(update);
      await updateMemberProfile(user.uid, update);
      setEditingProfile(false);
    } catch (error) {
      updateCurrentUser(previousProfile);
      Alert.alert(
        "Profile not saved",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  };

  const handleEnablePush = async () => {
    if (registeringPush) {
      return;
    }
    try {
      setRegisteringPush(true);
      const result = await requestPushPermissionAndRegister(user.uid);
      setPushRegistration(result);
      if (result.status !== "registered") {
        Alert.alert("Push notifications", result.message);
      }
    } finally {
      setRegisteringPush(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Settings"
        showBack
        onBack={() => safeGoBack(navigation, "DashboardHome")}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.profileCard}>
            <Avatar
              initials={getInitials(user.fullName)}
              photoURL={user.photoURL}
              size={52}
              statusDot={user.financialStatus}
            />
            <View style={styles.profileText}>
              <Text style={styles.name}>{user.fullName}</Text>
              <Text style={styles.email}>{user.email}</Text>
              <Badge
                label={user.role.replace("_", " ").toUpperCase()}
                color={colors.gold.default}
              />
            </View>
          </View>

          {editingProfile ? (
            <View style={styles.formCard}>
              <ProfileField
                control={control}
                error={formState.errors.fullName?.message}
                label="FULL NAME"
                name="fullName"
                rules={{ required: "Full name is required." }}
              />
              <ProfileField
                control={control}
                error={formState.errors.phone?.message}
                keyboardType="phone-pad"
                label="PHONE"
                name="phone"
                rules={{ required: "Phone number is required." }}
              />
              <ProfileField
                control={control}
                error={formState.errors.address?.message}
                label="ADDRESS"
                multiline
                name="address"
              />
              <ProfileField
                control={control}
                error={formState.errors.photoURL?.message}
                keyboardType="url"
                label="PHOTO URL"
                name="photoURL"
                rules={{
                  validate: (value: string) =>
                    !value.trim() ||
                    /^https?:\/\/\S+$/i.test(value.trim()) ||
                    "Enter a valid photo URL.",
                }}
              />
              <GoldButton
                label="Save Profile"
                onPress={handleSubmit(handleSaveProfile)}
                loading={savingProfile}
                fullWidth
              />
              <OutlineButton
                label="Cancel"
                onPress={handleCancelEdit}
                fullWidth
              />
            </View>
          ) : (
            <OutlineButton
              label="Edit Profile"
              onPress={() => setEditingProfile(true)}
              fullWidth
            />
          )}

          <Text style={styles.sectionLabel}>APP SETTINGS</Text>
          <Row
            label="Currency"
            value={`${user.currencySymbol} Nigerian Naira`}
          />
          <Row label="Timezone" value={`${user.timezone} (UTC+1)`} />
          <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
          <ToggleRow
            label="Events & Meetings"
            value={user.notificationPreferences.events}
            disabled={Boolean(savingPreference)}
            onValueChange={(value) => handleToggleNotification("events", value)}
          />
          <ToggleRow
            label="Finance & Dues"
            value={user.notificationPreferences.finance}
            disabled={Boolean(savingPreference)}
            onValueChange={(value) =>
              handleToggleNotification("finance", value)
            }
          />
          <ToggleRow
            label="Voting & Polls"
            value={user.notificationPreferences.voting}
            disabled={Boolean(savingPreference)}
            onValueChange={(value) => handleToggleNotification("voting", value)}
          />
          <View style={styles.pushCard}>
            <View style={styles.pushCopy}>
              <Text style={styles.pushTitle}>Push Notifications</Text>
              <Text style={styles.pushMeta}>
                {pushRegistration?.message ??
                  "Enable device alerts for important updates."}
              </Text>
            </View>
            <GoldButton
              label={
                pushRegistration?.status === "registered"
                  ? "Enabled"
                  : "Enable Push"
              }
              onPress={handleEnablePush}
              loading={registeringPush}
              disabled={pushRegistration?.status === "registered"}
              fullWidth
            />
          </View>
          <Text style={styles.sectionLabel}>LINKS</Text>
          <Row label="Privacy Policy" value="Open" />
          <Row label="Terms of Use" value="Open" />
          <Row label="Help & Support" value="Open" />
          <Row label="About Tiwani" value="v2.1" />
          <OutlineButton
            label="Sign Out"
            onPress={handleSignOut}
            color={colors.status.error}
            fullWidth
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const ProfileField = ({
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
          autoCapitalize={
            keyboardType === "email-address" || keyboardType === "url"
              ? "none"
              : undefined
          }
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

const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

const ToggleRow = ({
  label,
  disabled,
  onValueChange,
  value,
}: {
  label: string;
  disabled?: boolean;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Switch
      value={value}
      disabled={disabled}
      onValueChange={onValueChange}
      trackColor={{ false: colors.bg.elevated, true: colors.gold.dark }}
      thumbColor={colors.bg.secondary}
    />
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  profileCard: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    backgroundColor: colors.bg.card,
  },
  profileText: { flex: 1, gap: spacing.xs },
  name: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
  },
  email: { fontSize: typography.size.sm, color: colors.text.secondary },
  formCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
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
    marginTop: spacing.lg,
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.8,
  },
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    backgroundColor: colors.bg.card,
  },
  rowLabel: { fontSize: typography.size.base, color: colors.text.primary },
  rowValue: { fontSize: typography.size.base, color: colors.text.secondary },
  pushCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  pushCopy: { gap: spacing.xs },
  pushTitle: {
    fontSize: typography.size.base,
    color: colors.text.primary,
    fontWeight: typography.weight.bold,
  },
  pushMeta: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
});

export default SettingsScreen;
