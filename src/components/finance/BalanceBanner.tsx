import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Badge from '../common/Badge';
import OutlineButton from '../common/OutlineButton';
import {colors, spacing, typography} from '../../theme';
import {formatCurrency} from '../../utils/formatCurrency';

interface Props {
  outstanding: number;
}

const BalanceBanner = ({outstanding}: Props) => {
  const clear = outstanding <= 0;
  const color = clear ? colors.status.success : colors.status.error;

  return (
    <View style={styles.banner}>
      <Text style={styles.label}>OUTSTANDING BALANCE</Text>
      <Text style={[styles.amount, {color}]}>{formatCurrency(outstanding)}</Text>
      <Badge label={clear ? 'IN GOOD STANDING' : 'DUES OVERDUE'} color={color} />
      {!clear && (
        <OutlineButton
          label="Contact Treasurer to Pay"
          onPress={() => {}}
          fullWidth
          color={colors.status.error}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
