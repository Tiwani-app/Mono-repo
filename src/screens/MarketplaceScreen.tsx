import React, {useState} from 'react';
import {FlatList, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import GoldButton from '../components/common/GoldButton';
import ScreenHeader from '../components/common/ScreenHeader';
import AdminListingCard from '../components/marketplace/AdminListingCard';
import ListingCard from '../components/marketplace/ListingCard';
import {useMarketplace} from '../hooks/useMarketplace';
import {useAuthStore} from '../store/authStore';
import {colors, spacing, typography} from '../theme';
import {isAdmin} from '../utils/roleGuard';

const MarketplaceScreen = ({navigation}: any) => {
  const [tab, setTab] = useState<'browse' | 'manage'>('browse');
  const {listings} = useMarketplace();
  const {user} = useAuthStore();
  const admin = isAdmin(user);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Marketplace"
        showBack
        onBack={navigation.goBack}
        rightElement={admin ? <Badge label={`${listings.length}/2 MAX`} color={colors.status.purple} /> : null}
      />
      <View style={styles.tabs}>
        <Tab label="Browse" active={tab === 'browse'} onPress={() => setTab('browse')} />
        {admin && <Tab label="Manage" active={tab === 'manage'} onPress={() => setTab('manage')} />}
      </View>
      <FlatList
        data={listings}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.infoBanner}>
            <Text style={styles.infoText}>
              {tab === 'browse' ? 'Items listed by admin. Enquire directly.' : 'Listing Limit: 2 items maximum'}
            </Text>
          </View>
        }
        renderItem={({item}) => (tab === 'manage' ? <AdminListingCard listing={item} /> : <ListingCard listing={item} />)}
        ListFooterComponent={
          admin && tab === 'manage' ? (
            <GoldButton
              label={listings.length >= 2 ? 'Max 2 listings reached' : 'Add New Listing'}
              onPress={() => {}}
              disabled={listings.length >= 2}
              fullWidth
            />
          ) : null
        }
        ListEmptyComponent={
          <EmptyState icon="🏷️" title="Nothing for sale" message="The admin hasn't listed any items yet." />
        }
      />
    </SafeAreaView>
  );
};

const Tab = ({active, label, onPress}: {active: boolean; label: string; onPress: () => void}) => (
  <TouchableOpacity style={[styles.tab, active && styles.activeTab]} onPress={onPress}>
    <Text style={[styles.tabText, active && styles.activeTabText]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.bg.secondary},
  tabs: {flexDirection: 'row', margin: spacing.lg, padding: spacing.xs, borderRadius: 8, backgroundColor: colors.bg.card},
  tab: {flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 6},
  activeTab: {backgroundColor: colors.gold.default},
  tabText: {fontSize: typography.size.sm, color: colors.text.secondary, fontWeight: typography.weight.bold},
  activeTabText: {color: colors.text.onGold},
  content: {padding: spacing.lg, gap: spacing.md},
  infoBanner: {padding: spacing.md, borderRadius: 8, backgroundColor: `${colors.status.purple}16`},
  infoText: {fontSize: typography.size.sm, color: colors.text.secondary},
});

export default MarketplaceScreen;
