import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Badge from '../common/Badge';
import ProgressBar from '../common/ProgressBar';
import {colors, spacing, typography} from '../../theme';
import {DuesPeriod} from '../../types/finance';
import {formatCurrency} from '../../utils/formatCurrency';

interface Props {
  period: DuesPeriod;
}

const DuesPeriodCard = ({period}: Props) => {
  const statusColor =
    period.status === 'settled'
      ? colors.status.success
      : period.status === 'overdue'
        ? colors.status.error
        : colors.gold.default;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.content}>
          <Text style={styles.name}>{period.name}</Text>
          <Text style={styles.amount}>{formatCurrency(period.amount)} per member</Text>
        </View>
        <Badge label={period.status.toUpperCase()} color={statusColor} />
      </View>
      <Text style={styles.progressLabel}>
        {period.paidCount}/{period.totalMembers} paid
      </Text>
      <ProgressBar value={period.totalMembers > 0 ? period.paidCount / period.totalMembers : 0} color={statusColor} />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.bg.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  row: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md},
  content: {flex: 1, gap: spacing.xs},
  name: {fontSize: typography.size.md, fontWeight: typography.weight.bold, color: colors.text.primary},
  amount: {fontSize: typography.size.sm, color: colors.text.secondary},
  progressLabel: {fontSize: typography.size.sm, color: colors.text.secondary},
});

export default DuesPeriodCard;
