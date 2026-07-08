import React from 'react';
import {StyleSheet, Text, TouchableOpacity} from 'react-native';
import {colors, spacing, typography} from '../../theme';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  color?: string;
  size?: 'sm' | 'md';
}

const OutlineButton = ({
  label,
  onPress,
  disabled,
  fullWidth,
  color = colors.gold.default,
  size = 'md',
}: Props) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    style={[
      styles.base,
      size === 'sm' && styles.sm,
      {borderColor: color},
      fullWidth && styles.fullWidth,
      disabled && styles.disabled,
    ]}
    activeOpacity={0.8}>
    <Text style={[styles.label, size === 'sm' && styles.labelSm, {color}]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: 11,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
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
    fontWeight: typography.weight.semibold,
  },
  labelSm: {fontSize: typography.size.sm},
});

export default OutlineButton;
