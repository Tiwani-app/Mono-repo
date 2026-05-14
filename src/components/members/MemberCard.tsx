import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from '../common/FeatherIcon';
import Avatar from '../common/Avatar';
import Badge from '../common/Badge';
import {colors, spacing, typography} from '../../theme';
import {User} from '../../types/user';
import {formatCurrency} from '../../utils/formatCurrency';
import {getInitials} from '../../utils/getInitials';

interface Props {
  member: User;
  onPress: () => void;
}

const MemberCard = ({member, onPress}: Props) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
    <Avatar
      initials={getInitials(member.fullName)}
      photoURL={member.photoURL}
      size={44}
      statusDot={member.financialStatus}
    />
    <View style={styles.content}>
      <Text style={styles.name}>{member.fullName}</Text>
      <Text style={styles.role}>{member.role.replace('_', ' ')}</Text>
      {member.financialStatus === 'red' && (
        <Badge label={`Owes ${formatCurrency(member.outstandingBalance)}`} color={colors.status.error} />
      )}
    </View>
    <Icon name="chevron-right" size={18} color={colors.text.tertiary} />
  </TouchableOpacity>
);

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
});

export default MemberCard;
