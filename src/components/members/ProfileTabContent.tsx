import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, spacing, typography} from '../../theme';

interface Props {
  children: React.ReactNode;
}

const ProfileTabContent = ({children}: Props) => <View style={styles.container}>{children}</View>;

export const ProfileInfoRow = ({label, value}: {label: string; value: string}) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    backgroundColor: colors.bg.card,
  },
  row: {gap: spacing.xs},
  label: {fontSize: typography.size.xs, color: colors.text.secondary},
  value: {fontSize: typography.size.base, color: colors.text.primary},
});

export default ProfileTabContent;
