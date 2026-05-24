import React, {useEffect, useMemo} from 'react';
import {FlatList, StyleSheet, TextInput, TouchableOpacity} from 'react-native';
import Icon from '../../components/common/FeatherIcon';
import {SafeAreaView} from 'react-native-safe-area-context';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ScreenHeader from '../../components/common/ScreenHeader';
import MemberCard from '../../components/members/MemberCard';
import {useMembers} from '../../hooks/useMembers';
import {useAuthStore} from '../../store/authStore';
import {colors, spacing} from '../../theme';
import {safeGoBack} from '../../utils/navigation';
import {isAdmin} from '../../utils/roleGuard';

const MembersListScreen = ({navigation}: any) => {
  const {user} = useAuthStore();
  const {loading, members, searchQuery, setSearchQuery} = useMembers();

  useEffect(() => {
    if (user && !isAdmin(user)) {
      navigation.getParent()?.navigate('Dashboard');
    }
  }, [navigation, user]);

  const filteredMembers = useMemo(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return members.filter(member => member.fullName.toLowerCase().includes(query));
    }
    return members;
  }, [members, searchQuery]);

  if (loading) {
    return <LoadingSpinner />;
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
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search members"
            placeholderTextColor={colors.text.tertiary}
            style={styles.search}
          />
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
            message={searchQuery ? 'No members match your search.' : 'Members will appear here once they are added.'}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.bg.secondary},
  content: {padding: spacing.lg, gap: spacing.md},
  search: {
    minHeight: 48,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.tertiary,
    color: colors.text.primary,
  },
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
