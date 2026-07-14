import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from '../common/FeatherIcon';
import Badge from '../common/Badge';
import {colors, spacing, typography} from '../../theme';
import {LedgerEntry, LedgerType} from '../../types/finance';
import {
  chargeStatusColor,
  chargeStatusLabel,
  getChargeDisplayStatus,
} from '../../utils/financeChargeStatus';
import {formatCurrency} from '../../utils/formatCurrency';
import {formatDisplayDate} from '../../utils/formatDate';

const TYPE_ICONS: Record<LedgerType, string> = {
  dues: 'file-text',
  levy: 'file-text',
  donation: 'gift',
  fine: 'alert-triangle',
  pledge: 'heart',
  other: 'file-plus',
  payment: 'arrow-up',
};

interface Props {
  entry: LedgerEntry;
  onDelete?: (entry: LedgerEntry) => void;
}

const LedgerRow = ({entry, onDelete}: Props) => {
  const isPayment = entry.type === 'payment';
  const date = entry.paidAt ?? entry.dueDate;
  const displayStatus = getChargeDisplayStatus(entry);
  const badgeLabel = chargeStatusLabel(displayStatus);
  const badgeColor = chargeStatusColor(displayStatus);

  return (
    <View style={styles.row}>
      <View style={[styles.iconBox, isPayment && styles.paymentIcon]}>
        <Icon
          name={TYPE_ICONS[entry.type]}
          size={16}
          color={isPayment ? colors.status.success : colors.gold.default}
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>{entry.label}</Text>
        <Text style={styles.date}>{date ? formatDisplayDate(date) : 'No date'}</Text>
      </View>
      <View style={styles.trailing}>
        <Text style={[styles.amount, isPayment && styles.paymentAmount]}>
          {isPayment ? '+' : '-'}
          {formatCurrency(entry.amount)}
        </Text>
        <Badge
          label={badgeLabel}
          color={badgeColor}
        />
      </View>
      {onDelete && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(entry)}
          activeOpacity={0.8}
        >
          <Icon name="trash-2" size={16} color={colors.status.error} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.bg.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.gold.default}18`,
  },
  paymentIcon: {backgroundColor: `${colors.status.success}18`},
  content: {flex: 1, gap: spacing.xs},
  label: {fontSize: typography.size.base, fontWeight: typography.weight.semibold, color: colors.text.primary},
  date: {fontSize: typography.size.sm, color: colors.text.secondary},
  trailing: {alignItems: 'flex-end', gap: spacing.xs},
  deleteButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: `${colors.status.error}14`,
  },
  amount: {fontSize: typography.size.base, fontWeight: typography.weight.bold, color: colors.text.primary},
  paymentAmount: {color: colors.status.success},
});

// Memoized so ledger list re-renders skip unchanged rows.
export default React.memo(LedgerRow);
