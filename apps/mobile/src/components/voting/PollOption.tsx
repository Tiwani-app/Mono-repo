import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import ProgressBar from '../common/ProgressBar';
import {colors, spacing, typography} from '../../theme';
import {PollOption as PollOptionType} from '../../types/voting';

interface Props {
  option: PollOptionType;
  totalVotes: number;
  selected: boolean;
  showResult: boolean;
  onSelect: () => void;
  disabled: boolean;
}

const PollOption = ({option, totalVotes, selected, showResult, onSelect, disabled}: Props) => {
  const percent = totalVotes > 0 ? option.voteCount / totalVotes : 0;

  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.selected]}
      onPress={onSelect}
      disabled={disabled}
      activeOpacity={0.8}>
      <View style={styles.row}>
        <View style={[styles.radio, selected && styles.radioSelected]} />
        <Text style={styles.label}>{option.label}</Text>
        {showResult && <Text style={styles.percent}>{Math.round(percent * 100)}%</Text>}
      </View>
      {showResult && <ProgressBar value={percent} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    minHeight: 56,
    padding: spacing.lg,
    gap: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  selected: {borderColor: colors.gold.default, backgroundColor: `${colors.gold.default}12`},
  row: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.text.tertiary,
  },
  radioSelected: {borderColor: colors.gold.default, backgroundColor: colors.gold.default},
  label: {flex: 1, fontSize: typography.size.base, color: colors.text.primary},
  percent: {fontSize: typography.size.sm, color: colors.gold.light},
});

export default PollOption;
