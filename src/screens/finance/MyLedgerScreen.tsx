import React from 'react';
import {FlatList, StyleSheet, Text} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import BalanceBanner from '../../components/finance/BalanceBanner';
import EmptyState from '../../components/common/EmptyState';
import LedgerRow from '../../components/finance/LedgerRow';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ScreenHeader from '../../components/common/ScreenHeader';
import {useFinance} from '../../hooks/useFinance';
import {useAuthStore} from '../../store/authStore';
import {colors, spacing, typography} from '../../theme';

const MyLedgerScreen = ({navigation, route}: any) => {
  const {user} = useAuthStore();
  const targetUid = route.params?.memberId ?? user?.uid;
  const {ledgerEntries, loading} = useFinance(targetUid);
  const outstanding = ledgerEntries
    .filter(entry => entry.type !== 'payment' && !entry.paid)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const handleBack = () => {
    if (navigation.canGoBack?.()) {
      navigation.goBack();
      return;
    }

    navigation.getParent?.()?.navigate('Dashboard', {screen: 'DashboardHome'});
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="My Finances" showBack onBack={handleBack} />
      <FlatList
        data={ledgerEntries}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <BalanceBanner outstanding={outstanding} />
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

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.bg.secondary},
  content: {padding: spacing.lg, gap: spacing.md},
  sectionLabel: {
    marginTop: spacing.lg,
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.8,
  },
});

export default MyLedgerScreen;
