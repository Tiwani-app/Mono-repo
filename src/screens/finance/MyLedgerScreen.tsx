import React from 'react';
import {Alert, FlatList, Linking, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Avatar from '../../components/common/Avatar';
import Badge from '../../components/common/Badge';
import BalanceBanner from '../../components/finance/BalanceBanner';
import EmptyState from '../../components/common/EmptyState';
import GoldButton from '../../components/common/GoldButton';
import LedgerRow from '../../components/finance/LedgerRow';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import OutlineButton from '../../components/common/OutlineButton';
import ScreenHeader from '../../components/common/ScreenHeader';
import SyncStatusBanner from '../../components/common/SyncStatusBanner';
import {useFinance} from '../../hooks/useFinance';
import {useMembers} from '../../hooks/useMembers';
import {useAuthStore} from '../../store/authStore';
import {colors, spacing, typography} from '../../theme';
import {formatCurrency} from '../../utils/formatCurrency';
import {canViewLedgerForMember} from '../../utils/financeGuards';
import {getInitials} from '../../utils/getInitials';
import {isAdmin} from '../../utils/roleGuard';

const TREASURER_EMAIL = 'treasurer@tiwani.app';

const MyLedgerScreen = ({navigation, route}: any) => {
  const {user} = useAuthStore();
  const routeMemberId = route.params?.memberId as string | undefined;
  const adminViewingMember = isAdmin(user) && Boolean(routeMemberId);
  const canViewLedger = canViewLedgerForMember(user, routeMemberId);
  const targetUid = canViewLedger ? routeMemberId ?? user?.uid : undefined;
  const {error, lastSyncedAt, ledgerEntries, loading, syncState} = useFinance(targetUid);
  const {error: membersError, loading: membersLoading, members} = useMembers();
  const selectedMember = members.find(member => member.uid === targetUid);
  const outstanding = ledgerEntries
    .filter(entry => entry.type !== 'payment' && !entry.paid)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const totalCharged = ledgerEntries
    .filter(entry => entry.type !== 'payment')
    .reduce((sum, entry) => sum + entry.amount, 0);
  const totalPaid = ledgerEntries
    .filter(entry => entry.type !== 'payment' && entry.paid)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const handleBack = () => {
    if (navigation.canGoBack?.()) {
      navigation.goBack();
      return;
    }

    navigation.getParent?.()?.navigate('Dashboard', {screen: 'DashboardHome'});
  };
  const handleContactTreasurer = async () => {
    const subject = encodeURIComponent('Ledger balance question');
    const body = encodeURIComponent(
      `Hello Treasurer,\n\nI have a question about my outstanding balance of ${formatCurrency(outstanding)}.\n\nName: ${user?.fullName ?? ''}\nMember ID: ${targetUid ?? ''}`,
    );
    const url = `mailto:${TREASURER_EMAIL}?subject=${subject}&body=${body}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('Email unavailable', `Please contact ${TREASURER_EMAIL}.`);
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Email unavailable', `Please contact ${TREASURER_EMAIL}.`);
    }
  };

  if (loading || (adminViewingMember && membersLoading)) {
    return <LoadingSpinner />;
  }

  if (!canViewLedger) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="My Finances" showBack onBack={handleBack} />
        <EmptyState
          icon="!"
          title="Permission denied"
          message="You can only view your own ledger."
          actionLabel="Back"
          onAction={handleBack}
        />
      </SafeAreaView>
    );
  }

  if (error || (adminViewingMember && membersError)) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title={adminViewingMember ? 'Member Finances' : 'My Finances'} showBack onBack={handleBack} />
        <EmptyState
          icon="!"
          title="Ledger unavailable"
          message={error ?? membersError ?? 'Please try again.'}
          actionLabel="Back"
          onAction={handleBack}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title={adminViewingMember ? 'Member Finances' : 'My Finances'} showBack onBack={handleBack} />
      <FlatList
        data={ledgerEntries}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <SyncStatusBanner state={syncState} lastSyncedAt={lastSyncedAt} />
            {adminViewingMember && selectedMember && (
              <View style={styles.memberFinanceCard}>
                <View style={styles.memberHeader}>
                  <Avatar
                    initials={getInitials(selectedMember.fullName)}
                    photoURL={selectedMember.photoURL}
                    statusDot={selectedMember.financialStatus}
                    size={52}
                  />
                  <View style={styles.memberCopy}>
                    <Text style={styles.memberName}>{selectedMember.fullName}</Text>
                    <Text style={styles.memberMeta}>{selectedMember.email}</Text>
                    <View style={styles.badgeRow}>
                      <Badge
                        label={selectedMember.financialStatus === 'green' ? 'CLEAR' : 'OVERDUE'}
                        color={selectedMember.financialStatus === 'green' ? colors.status.success : colors.status.error}
                      />
                      <Badge label={selectedMember.status.toUpperCase()} color={colors.gold.default} />
                    </View>
                  </View>
                </View>
                <View style={styles.financeSummaryRow}>
                  <SummaryStat label="Charged" value={formatCurrency(totalCharged)} />
                  <SummaryStat label="Paid" value={formatCurrency(totalPaid)} />
                  <SummaryStat label="Outstanding" value={formatCurrency(outstanding)} tone={outstanding > 0 ? colors.status.error : colors.status.success} />
                </View>
                <View style={styles.adminActions}>
                  <GoldButton
                    label="Record Payment"
                    onPress={() => navigation.navigate('RecordPayment', {memberId: selectedMember.uid})}
                    fullWidth
                  />
                  <OutlineButton
                    label="Add Charge"
                    onPress={() => navigation.navigate('AdHocCharge', {memberId: selectedMember.uid})}
                    fullWidth
                  />
                </View>
              </View>
            )}
            <BalanceBanner outstanding={outstanding} />
            {outstanding > 0 && !adminViewingMember && (
              <View style={styles.contactCard}>
                <View style={styles.contactCopy}>
                  <Text style={styles.contactTitle}>Need help with this balance?</Text>
                  <Text style={styles.contactText}>
                    Contact the treasurer to review payments or confirm next steps.
                  </Text>
                </View>
                <OutlineButton
                  label="Contact Treasurer"
                  onPress={handleContactTreasurer}
                  fullWidth
                />
              </View>
            )}
            <Text style={styles.sectionLabel}>TRANSACTION HISTORY</Text>
          </>
        }
        renderItem={({item}) => <LedgerRow entry={item} />}
        ListEmptyComponent={
          <EmptyState
            icon="📄"
            title="No transactions"
            message="Your financial history will appear here."
          />
        }
      />
    </SafeAreaView>
  );
};

const SummaryStat = ({label, tone, value}: {label: string; tone?: string; value: string}) => (
  <View style={styles.summaryStat}>
    <Text style={[styles.summaryValue, tone ? {color: tone} : null]}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.bg.secondary},
  content: {padding: spacing.lg, gap: spacing.md},
  memberFinanceCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  memberHeader: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
  memberCopy: {flex: 1, gap: spacing.xs},
  memberName: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
  },
  memberMeta: {fontSize: typography.size.sm, color: colors.text.secondary},
  badgeRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
  financeSummaryRow: {flexDirection: 'row', gap: spacing.sm},
  summaryStat: {
    flex: 1,
    minHeight: 70,
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.bg.elevated,
  },
  summaryValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
  },
  summaryLabel: {fontSize: typography.size.xs, color: colors.text.secondary},
  adminActions: {gap: spacing.sm},
  contactCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  contactCopy: {gap: spacing.xs},
  contactTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  contactText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
  sectionLabel: {
    marginTop: spacing.lg,
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.8,
  },
});

export default MyLedgerScreen;
