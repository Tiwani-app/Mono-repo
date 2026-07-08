import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from '../common/FeatherIcon';
import Avatar from '../common/Avatar';
import Badge from '../common/Badge';
import {colors, spacing, typography} from '../../theme';
import {User} from '../../types/user';
import {
  getFinanceStanding,
  getFinanceStandingColor,
  FinanceStanding,
} from '../../utils/financeStanding';
import {formatCurrency} from '../../utils/formatCurrency';
import {getInitials} from '../../utils/getInitials';

interface Props {
  financeSummary?: {
    outstanding: number;
    overdue: number;
  };
  member: User;
  onPress: () => void;
  showFinance?: boolean;
}

const memberStatusColors = {
  active: colors.status.success,
  pending: colors.status.info,
  inactive: colors.text.secondary,
  suspended: colors.status.error,
};

const memberFinanceLabel = (
  standing: FinanceStanding,
  outstandingBalance: number,
) => {
  if (standing === 'clear') {
    return 'PAID';
  }
  const balance = formatCurrency(outstandingBalance);
  return standing === 'overdue' ? `OVERDUE ${balance}` : `OWING ${balance}`;
};

const MemberCard = ({
  financeSummary,
  member,
  onPress,
  showFinance = true,
}: Props) => {
  const standing = getFinanceStanding(
    member.financialStatus,
    member.outstandingBalance,
  );
  const overdue = financeSummary?.overdue ?? 0;
  const outstanding = financeSummary?.outstanding ?? member.outstandingBalance;
  const owing = Math.max(0, outstanding - overdue);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Avatar
        initials={getInitials(member.fullName)}
        photoURL={member.photoURL}
        size={44}
        statusDot={showFinance ? member.financialStatus : null}
      />
      <View style={styles.content}>
        <Text style={styles.name}>{member.fullName}</Text>
        <Text style={styles.role}>{member.role.replace('_', ' ')}</Text>
        <View style={styles.badgeRow}>
          <Badge label={member.status.toUpperCase()} color={memberStatusColors[member.status]} />
          {showFinance && financeSummary && outstanding <= 0 && (
            <Badge label="PAID" color={colors.status.success} />
          )}
          {showFinance && financeSummary && overdue > 0 && (
            <Badge
              label={`OVERDUE ${formatCurrency(overdue)}`}
              color={colors.status.error}
            />
          )}
          {showFinance && financeSummary && owing > 0 && (
            <Badge
              label={`OWING ${formatCurrency(owing)}`}
              color={colors.gold.default}
            />
          )}
          {showFinance && !financeSummary && (
            <Badge
              label={memberFinanceLabel(standing, member.outstandingBalance)}
              color={getFinanceStandingColor(standing)}
            />
          )}
        </View>
      </View>
      <Icon name="chevron-right" size={18} color={colors.text.tertiary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
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
  content: {flex: 1, gap: spacing.xs},
  name: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  role: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textTransform: 'capitalize',
  },
  badgeRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
});

export default MemberCard;
