import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Badge from '../common/Badge';
import {spacing, typography, useThemeColors, useThemedStyles, AppColors} from '../../theme';
import {formatCurrency} from '../../utils/formatCurrency';
import {
  getFinanceStanding,
  getFinanceStandingBannerLabel,
  getFinanceStandingColor,
} from '../../utils/financeStanding';
import {FinancialStatus} from '../../types/user';

interface Props {
  outstanding: number;
  financialStatus?: FinancialStatus;
}

const BalanceBanner = ({outstanding, financialStatus}: Props) => {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);

  const standing = getFinanceStanding(financialStatus, outstanding);
  const color = getFinanceStandingColor(standing);

  return (
    <View style={styles.banner}>
      <Text style={styles.label}>OUTSTANDING BALANCE</Text>
      <Text style={[styles.amount, {color}]}>{formatCurrency(outstanding)}</Text>
      <Badge label={getFinanceStandingBannerLabel(standing)} color={color} />
    </View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  banner: {
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.bg.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  label: {fontSize: typography.size.xs, color: colors.text.secondary, letterSpacing: 0.5},
  amount: {fontSize: typography.size.xxxl, fontWeight: typography.weight.black},
});

export default BalanceBanner;
