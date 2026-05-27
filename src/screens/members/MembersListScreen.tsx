import React, {useMemo} from 'react';
import {FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import Icon from '../../components/common/FeatherIcon';
import {SafeAreaView} from 'react-native-safe-area-context';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ScreenHeader from '../../components/common/ScreenHeader';
import SyncStatusBanner from '../../components/common/SyncStatusBanner';
import MemberCard from '../../components/members/MemberCard';
import {useMembers} from '../../hooks/useMembers';
import {useAuthStore} from '../../store/authStore';
import {colors, spacing} from '../../theme';
import {MemberStatus} from '../../types/user';
import {safeGoBack} from '../../utils/navigation';
import {isAdmin} from '../../utils/roleGuard';

type StatusFilter = 'all' | MemberStatus;

const statusFilters: {label: string; value: StatusFilter}[] = [
  {label: 'All', value: 'all'},
  {label: 'Active', value: 'active'},
  {label: 'Pending', value: 'pending'},
  {label: 'Inactive', value: 'inactive'},
  {label: 'Suspended', value: 'suspended'},
];

const MembersListScreen = ({navigation}: any) => {
  const {user} = useAuthStore();
  const {error, lastSyncedAt, loading, members, searchQuery, setSearchQuery, syncState} = useMembers();
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all');

  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return members.filter(member => {
      const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
      const searchableText = [member.fullName, member.email, member.phone].join(' ').toLowerCase();
      const matchesSearch = !query || searchableText.includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [members, searchQuery, statusFilter]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAdmin(user)) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Members"
          showBack
          onBack={() => safeGoBack(navigation, 'DashboardHome')}
        />
        <EmptyState
          icon="!"
          title="Admin only"
          message="Only admins can browse and manage the member directory."
        />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Members"
          showBack
          onBack={() => safeGoBack(navigation, 'DashboardHome')}
        />
        <EmptyState
          icon="!"
          title="Members unavailable"
          message={error}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Members"
        showBack
        onBack={() => safeGoBack(navigation, 'DashboardHome')}
        rightElement={
          isAdmin(user) ? (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate('MemberForm')}>
              <Icon name="user-plus" size={20} color={colors.text.onGold} />
            </TouchableOpacity>
          ) : null
        }
      />
      <FlatList
        data={filteredMembers}
        keyExtractor={item => item.uid}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <SyncStatusBanner state={syncState} lastSyncedAt={lastSyncedAt} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search name, email, or phone"
              placeholderTextColor={colors.text.tertiary}
              style={styles.search}
            />
            <View style={styles.filterRow}>
              {statusFilters.map(filter => {
                const selected = statusFilter === filter.value;
                return (
                  <TouchableOpacity
                    key={filter.value}
                    style={[styles.filterChip, selected && styles.selectedFilterChip]}
                    onPress={() => setStatusFilter(filter.value)}
                    activeOpacity={0.8}>
                    <Text style={[styles.filterText, selected && styles.selectedFilterText]}>
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        }
        renderItem={({item}) => (
          <MemberCard
            member={item}
            onPress={() => navigation.navigate('MemberProfile', {memberId: item.uid})}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon={searchQuery ? '🔍' : '👥'}
            title={searchQuery ? 'No results' : 'No members yet'}
            message={
              searchQuery || statusFilter !== 'all'
                ? 'No members match the current search or filter.'
                : 'Members will appear here once they are added.'
            }
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.bg.secondary},
  content: {padding: spacing.lg, gap: spacing.md},
  listHeader: {gap: spacing.md},
  search: {
    minHeight: 48,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.tertiary,
    color: colors.text.primary,
  },
  filterRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
  filterChip: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  selectedFilterChip: {
    borderColor: colors.gold.default,
    backgroundColor: `${colors.gold.default}22`,
  },
  filterText: {
    color: colors.text.secondary,
    fontWeight: '700',
  },
  selectedFilterText: {color: colors.gold.light},
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold.default,
  },
});

export default MembersListScreen;
