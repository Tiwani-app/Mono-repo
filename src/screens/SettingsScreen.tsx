import React from 'react';
import {Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Avatar from '../components/common/Avatar';
import Badge from '../components/common/Badge';
import OutlineButton from '../components/common/OutlineButton';
import ScreenHeader from '../components/common/ScreenHeader';
import {signOut} from '../services/authService';
import {updateMemberProfile} from '../services/membersService';
import {useAuthStore} from '../store/authStore';
import {colors, spacing, typography} from '../theme';
import {NotificationPreferences} from '../types/user';
import {getInitials} from '../utils/getInitials';

const SettingsScreen = ({navigation}: any) => {
  const {updateCurrentUser, user} = useAuthStore();

  if (!user) {
    return null;
  }

  const handleToggleNotification = async (key: keyof NotificationPreferences, value: boolean) => {
    const notificationPreferences = {...user.notificationPreferences, [key]: value};
    updateCurrentUser({notificationPreferences});
    await updateMemberProfile(user.uid, {notificationPreferences});
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Sign Out', style: 'destructive', onPress: signOut},
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Settings" showBack onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <Avatar initials={getInitials(user.fullName)} photoURL={user.photoURL} size={52} statusDot={user.financialStatus} />
          <View style={styles.profileText}>
            <Text style={styles.name}>{user.fullName}</Text>
            <Text style={styles.email}>{user.email}</Text>
            <Badge label={user.role.replace('_', ' ').toUpperCase()} color={colors.gold.default} />
          </View>
        </View>
        <Text style={styles.sectionLabel}>APP SETTINGS</Text>
        <Row label="Currency" value="₦ Nigerian Naira" />
        <Row label="Timezone" value="WAT (UTC+1)" />
        <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
        <ToggleRow
          label="Events & Meetings"
          value={user.notificationPreferences.events}
          onValueChange={value => handleToggleNotification('events', value)}
        />
        <ToggleRow
          label="Finance & Dues"
          value={user.notificationPreferences.finance}
          onValueChange={value => handleToggleNotification('finance', value)}
        />
        <ToggleRow
          label="Voting & Polls"
          value={user.notificationPreferences.voting}
          onValueChange={value => handleToggleNotification('voting', value)}
        />
        <Text style={styles.sectionLabel}>LINKS</Text>
        <Row label="Privacy Policy" value="Open" />
        <Row label="Terms of Use" value="Open" />
        <Row label="Help & Support" value="Open" />
        <Row label="About Tiwani" value="v2.1" />
        <OutlineButton label="Sign Out" onPress={handleSignOut} color={colors.status.error} fullWidth />
      </ScrollView>
    </SafeAreaView>
  );
};

const Row = ({label, value}: {label: string; value: string}) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

const ToggleRow = ({
  label,
  onValueChange,
  value,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{false: colors.bg.elevated, true: colors.gold.dark}}
      thumbColor={colors.bg.secondary}
    />
  </View>
);

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.bg.secondary},
  content: {padding: spacing.lg, gap: spacing.md},
  profileCard: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    backgroundColor: colors.bg.card,
  },
  profileText: {flex: 1, gap: spacing.xs},
  name: {fontSize: typography.size.lg, fontWeight: typography.weight.black, color: colors.text.primary},
  email: {fontSize: typography.size.sm, color: colors.text.secondary},
  sectionLabel: {
    marginTop: spacing.lg,
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.8,
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    backgroundColor: colors.bg.card,
  },
  rowLabel: {fontSize: typography.size.base, color: colors.text.primary},
  rowValue: {fontSize: typography.size.base, color: colors.text.secondary},
});

export default SettingsScreen;
