import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { SafeAreaView } from "react-native-safe-area-context";
import AttachmentField from "../components/common/AttachmentField";
import Avatar from "../components/common/Avatar";
import Badge from "../components/common/Badge";
import CalendarDateField from "../components/common/CalendarDateField";
import Icon from "../components/common/FeatherIcon";
import GoldButton from "../components/common/GoldButton";
import OutlineButton from "../components/common/OutlineButton";
import ScreenHeader from "../components/common/ScreenHeader";
import { env } from "../config/env";
import { signOut } from "../services/authService";
import { updateMemberProfile } from "../services/membersService";
import { requestPushPermissionAndRegister } from "../services/notificationsService";
import { useAuthStore } from "../store/authStore";
import { colors, spacing, typography } from "../theme";
import { NotificationPreferences, User } from "../types/user";
import { getInitials } from "../utils/getInitials";
import { formatTimezoneLabel } from "../utils/locale";
import { safeGoBack } from "../utils/navigation";
import {
  ProfileFormValues,
  buildNotificationPreferences,
  buildProfileUpdate,
  getPreviousProfile,
} from "../utils/settingsProfile";

const maritalOptions: { label: string; value: User["maritalStatus"] }[] = [
  { label: "Single", value: "single" },
  { label: "Married", value: "married" },
  { label: "Divorced", value: "divorced" },
  { label: "Widowed", value: "widowed" },
];

const SettingsScreen = ({ navigation }: any) => {
  const { updateCurrentUser, user } = useAuthStore();
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingPreference, setSavingPreference] = useState<
    keyof NotificationPreferences | null
  >(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [registeringPush, setRegisteringPush] = useState(false);

  const { control, handleSubmit, reset, formState, setValue, watch } =
    useForm<ProfileFormValues>({
      values: {
        fullName: user?.fullName ?? "",
        phone: user?.phone ?? "",
        address: user?.address ?? "",
        photoURL: user?.photoURL ?? "",
        maritalStatus: user?.maritalStatus ?? "single",
        dateOfBirth: user?.dateOfBirth ?? "",
        spouseName: user?.spouseName ?? "",
        spouseDateOfBirth: user?.spouseDateOfBirth ?? "",
        weddingAnniversary: user?.weddingAnniversary ?? "",
        children: user?.children ?? [],
      },
    });
  const { append, fields, remove } = useFieldArray({
    control,
    name: "children",
  });

  if (!user) {
    return null;
  }

  const selectedMaritalStatus = watch("maritalStatus");

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
      maritalStatus: user.maritalStatus,
      dateOfBirth: user.dateOfBirth ?? "",
      spouseName: user.spouseName ?? "",
      spouseDateOfBirth: user.spouseDateOfBirth ?? "",
      weddingAnniversary: user.weddingAnniversary ?? "",
      children: user.children,
    });
    setEditingProfile(false);
  };

  const handleSaveProfile = async (values: ProfileFormValues) => {
    if (savingProfile) {
      return;
    }

    const children = values.children
      .map((child) => ({
        name: child.name.trim(),
        dateOfBirth: child.dateOfBirth.trim(),
      }))
      .filter((child) => child.name || child.dateOfBirth);

    if (children.some((child) => !child.name)) {
      Alert.alert("Child name required", "Enter a name for each child.");
      return;
    }

    const normalizedValues =
      values.maritalStatus === "married"
        ? { ...values, children }
        : {
            ...values,
            children,
            spouseName: "",
            spouseDateOfBirth: "",
            weddingAnniversary: "",
          };

    const previousProfile = getPreviousProfile(user);
    const update = buildProfileUpdate(normalizedValues);

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

  const openExternalLink = async (label: string, url: string) => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      Alert.alert(
        `${label} unavailable`,
        "This link has not been configured for this build yet.",
      );
      return;
    }

    try {
      const supported = await Linking.canOpenURL(trimmedUrl);
      if (!supported) {
        Alert.alert(`${label} unavailable`, "This link could not be opened.");
        return;
      }
      await Linking.openURL(trimmedUrl);
    } catch {
      Alert.alert(`${label} unavailable`, "This link could not be opened.");
    }
  };

  const handleRegisterPush = async () => {
    if (registeringPush) {
      return;
    }
    try {
      setRegisteringPush(true);
      const result = await requestPushPermissionAndRegister(user.uid);
      Alert.alert(
        result.status === "registered"
          ? "Push notifications enabled"
          : "Push notifications unavailable",
        result.message,
      );
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
              <Controller
                control={control}
                name="dateOfBirth"
                render={({ field: { onChange, value } }) => (
                  <CalendarDateField
                    allowEmpty
                    value={value}
                    onChange={onChange}
                    label="DATE OF BIRTH"
                    placeholder="Choose your birthday"
                  />
                )}
              />
              <Text style={styles.sectionLabel}>MARITAL STATUS</Text>
              <ChipRow
                options={maritalOptions}
                selectedValue={selectedMaritalStatus}
                onChange={(value) => setValue("maritalStatus", value)}
              />
              {selectedMaritalStatus === "married" ? (
                <>
                  <ProfileField
                    control={control}
                    error={formState.errors.spouseName?.message}
                    label="SPOUSE NAME"
                    name="spouseName"
                  />
                  <Controller
                    control={control}
                    name="spouseDateOfBirth"
                    render={({ field: { onChange, value } }) => (
                      <CalendarDateField
                        allowEmpty
                        value={value}
                        onChange={onChange}
                        label="SPOUSE DATE OF BIRTH"
                        placeholder="Choose spouse birthday"
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="weddingAnniversary"
                    render={({ field: { onChange, value } }) => (
                      <CalendarDateField
                        allowEmpty
                        value={value}
                        onChange={onChange}
                        label="WEDDING ANNIVERSARY"
                        placeholder="Choose anniversary"
                      />
                    )}
                  />
                </>
              ) : null}
              <View style={styles.childrenHeader}>
                <Text style={styles.sectionLabel}>CHILDREN</Text>
                <OutlineButton
                  label="Add Child"
                  onPress={() => append({ name: "", dateOfBirth: "" })}
                />
              </View>
              {fields.length === 0 ? (
                <View style={styles.emptyFamilyCard}>
                  <Text style={styles.emptyFamilyText}>
                    No children added to your profile.
                  </Text>
                </View>
              ) : (
                fields.map((field, index) => (
                  <View key={field.id} style={styles.childCard}>
                    <View style={styles.childHeader}>
                      <Text style={styles.childTitle}>Child {index + 1}</Text>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => remove(index)}
                        activeOpacity={0.8}
                      >
                        <Icon
                          name="trash-2"
                          size={18}
                          color={colors.status.error}
                        />
                      </TouchableOpacity>
                    </View>
                    <ProfileField
                      control={control}
                      error={formState.errors.children?.[index]?.name?.message}
                      label="CHILD NAME"
                      name={`children.${index}.name`}
                    />
                    <Controller
                      control={control}
                      name={`children.${index}.dateOfBirth`}
                      render={({ field: { onChange, value } }) => (
                        <CalendarDateField
                          allowEmpty
                          value={value}
                          onChange={onChange}
                          label="CHILD DATE OF BIRTH"
                          placeholder="Choose child birthday"
                        />
                      )}
                    />
                  </View>
                ))
              )}
              <Controller
                control={control}
                name="photoURL"
                rules={{
                  validate: (value: string) =>
                    !value.trim() ||
                    /^https?:\/\/\S+$/i.test(value.trim()) ||
                    "Enter a valid photo URL.",
                }}
                render={({ field: { onChange, value } }) => (
                  <AttachmentField
                    label="PROFILE IMAGE"
                    mode="image"
                    fileName={user.fullName}
                    value={value}
                    onChangeText={onChange}
                    error={formState.errors.photoURL?.message}
                    placeholder="https://example.com/profile-photo.jpg"
                    helperText="Attach a profile photo or paste an image URL."
                    onPick={() =>
                      Alert.alert(
                        "Image picker",
                        "Profile photo selection will use the storage-backed picker when backend storage is connected.",
                      )
                    }
                  />
                )}
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
          <Row label="Currency" value={`${user.currencySymbol} US Dollar`} />
          <Row label="Timezone" value={formatTimezoneLabel(user.timezone)} />
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
                Enable device alerts for association announcements.
              </Text>
            </View>
            <GoldButton
              label="Enable Push"
              onPress={handleRegisterPush}
              loading={registeringPush}
              fullWidth
            />
          </View>
          <Text style={styles.sectionLabel}>LINKS</Text>
          <LinkRow
            label="Privacy Policy"
            value="Open"
            onPress={() =>
              openExternalLink("Privacy Policy", env.privacyPolicyUrl)
            }
          />
          <LinkRow
            label="Terms of Use"
            value="Open"
            onPress={() => openExternalLink("Terms of Use", env.termsUrl)}
          />
          <LinkRow
            label="Help & Support"
            value="Open"
            onPress={() => openExternalLink("Help & Support", env.supportUrl)}
          />
          <LinkRow
            label="Account Deletion"
            value="Request"
            onPress={() => navigation.navigate("AccountDeletion")}
          />
          <Row label="About Tiwani" value={`v${env.appVersion}`} />
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

const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

const LinkRow = ({
  label,
  onPress,
  value,
}: {
  label: string;
  onPress: () => void;
  value: string;
}) => (
  <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.82}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={[styles.rowValue, styles.linkValue]}>{value}</Text>
  </TouchableOpacity>
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
  sectionLabel: {
    marginTop: spacing.lg,
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.8,
  },
  childrenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  emptyFamilyCard: {
    minHeight: 56,
    justifyContent: "center",
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  emptyFamilyText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  childCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  childHeader: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  childTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  removeButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: colors.bg.tertiary,
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
  linkValue: { color: colors.gold.default, fontWeight: typography.weight.bold },
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
