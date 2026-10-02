import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {PaystackRateInfo} from '../../services/paymentsService';
import {spacing, typography, useThemedStyles, AppColors} from '../../theme';
import {formatRelativeTime} from '../../utils/formatDate';
import {
  formatNaira,
  formatRateChange,
  rateSourceLabel,
} from '../../utils/nairaRate';

interface Props {
  rate: NonNullable<PaystackRateInfo['inUse']>;
}

// The Naira rate members are charged at, its 24h movement and its age.
const NairaRateCard = ({rate}: Props) => {
  const styles = useThemedStyles(createStyles);

  const details = [
    rate.source === 'manual'
      ? null
      : `Market ${formatNaira(rate.midRate)} + ${rate.bufferPercent}%`,
    rate.change24hPercent !== null
      ? `${formatRateChange(rate.change24hPercent)} (24h)`
      : null,
  ].filter(Boolean);

  return (
    <View style={styles.card}>
      <Text style={styles.label}>NAIRA RATE</Text>
      <Text style={styles.rate}>
        {formatNaira(rate.appliedRate)}
        <Text style={styles.per}> per $1</Text>
      </Text>
      {details.length > 0 && (
        <Text style={styles.detail}>{details.join('  ·  ')}</Text>
      )}
      <Text style={styles.meta}>
        {rateSourceLabel(rate.source)}
        {rate.updatedAt
          ? `  ·  updated ${formatRelativeTime(new Date(rate.updatedAt))}`
          : ''}
      </Text>
    </View>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
  card: {
    gap: spacing.xs,
    padding: spacing.lg,
    backgroundColor: colors.bg.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  label: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  rate: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.black,
    color: colors.gold.default,
  },
  per: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },
  detail: {
    fontSize: typography.size.sm,
    color: colors.text.primary,
  },
  meta: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
  },
});

export default NairaRateCard;
