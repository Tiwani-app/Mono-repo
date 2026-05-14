import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import ProgressBar from '../common/ProgressBar';
import {colors, spacing, typography} from '../../theme';
import {Poll} from '../../types/voting';

interface Props {
  poll: Poll;
  onPress: () => void;
}

const PollCard = ({poll, onPress}: Props) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
    <Text style={styles.title}>{poll.title}</Text>
    <Text style={styles.question}>{poll.question}</Text>
    {poll.options.slice(0, 2).map(option => {
      const percent = poll.totalVotes > 0 ? option.voteCount / poll.totalVotes : 0;
      return (
        <View key={option.id} style={styles.option}>
          <View style={styles.optionRow}>
            <Text style={styles.optionLabel}>{option.label}</Text>
            <Text style={styles.percent}>{Math.round(percent * 100)}%</Text>
          </View>
          <ProgressBar value={percent} />
        </View>
      );
    })}
    <Text style={styles.footer}>{poll.totalVotes} votes · Tap to vote</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.bg.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  title: {fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.text.primary},
  question: {fontSize: typography.size.base, color: colors.text.secondary, lineHeight: 20},
  option: {gap: spacing.xs},
  optionRow: {flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md},
  optionLabel: {flex: 1, fontSize: typography.size.sm, color: colors.text.primary},
  percent: {fontSize: typography.size.sm, color: colors.gold.light},
  footer: {fontSize: typography.size.sm, color: colors.text.tertiary},
});

export default PollCard;
