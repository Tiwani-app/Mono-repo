import React from 'react';
import {ActivityIndicator, StyleSheet, Text, TouchableOpacity} from 'react-native';
import {colors, spacing, typography} from '../../theme';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  size?: 'sm' | 'md';
}

const GoldButton = ({label, onPress, disabled, loading, fullWidth, size = 'md'}: Props) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled || loading}
    style={[
      styles.base,
      size === 'sm' && styles.sm,
      fullWidth && styles.fullWidth,
      (disabled || loading) && styles.disabled,
    ]}
    activeOpacity={0.8}>
    {loading ? (
      <ActivityIndicator size="small" color={colors.text.onGold} />
    ) : (
      <Text style={[styles.label, size === 'sm' && styles.labelSm]}>{label}</Text>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: 11,
    backgroundColor: colors.gold.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sm: {
    minHeight: 34,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
  },
  fullWidth: {width: '100%'},
  disabled: {opacity: 0.45},
  label: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.onGold,
  },
  labelSm: {fontSize: typography.size.sm},
});

export default GoldButton;
