import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from '../common/FeatherIcon';
import Avatar from '../common/Avatar';
import Badge from '../common/Badge';
import {colors, spacing, typography} from '../../theme';
import {User} from '../../types/user';
import {
  getFinanceStanding,
  getFinanceStandingBadgeLabel,
  getFinanceStandingColor,
} from '../../utils/financeStanding';
import {formatCurrency} from '../../utils/formatCurrency';
import {getInitials} from '../../utils/getInitials';

interface Props {
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

const MemberCard = ({member, onPress, showFinance = true}: Props) => {
  const standing = getFinanceStanding(
    member.financialStatus,
    member.outstandingBalance,
  );

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
          {showFinance && (
            <Badge
              label={
                standing === 'clear'
                  ? getFinanceStandingBadgeLabel(standing)
                  : `OWES ${formatCurrency(member.outstandingBalance)}`
              }
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
