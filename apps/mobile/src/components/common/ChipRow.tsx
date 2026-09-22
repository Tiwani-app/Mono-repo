import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {spacing, typography, useThemedStyles, AppColors} from '../../theme';

interface Props<T extends string> {
  options: {label: string; value: T}[];
  selectedValue: T;
  onChange: (value: T) => void;
}

const ChipRow = <T extends string>({
  options,
  selectedValue,
  onChange,
}: Props<T>) => {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.chipRow}>
      {options.map((option) => {
        const selected = selectedValue === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.chip, selected && styles.selectedChip]}
            onPress={() => onChange(option.value)}
            activeOpacity={0.8}>
            <Text
              style={[styles.chipText, selected && styles.selectedChipText]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
    chip: {
      minHeight: 40,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
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
    selectedChipText: {color: colors.gold.light},
  });

export default ChipRow;
