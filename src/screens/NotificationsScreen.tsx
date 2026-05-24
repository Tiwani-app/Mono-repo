import React, { useMemo, useState } from 'react';
import { Alert, SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from '../components/common/FeatherIcon';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ScreenHeader from '../components/common/ScreenHeader';
import { useNotifications } from '../hooks/useNotifications';
import { colors, spacing, typography } from '../theme';
import {
  NotificationTarget,
  NotificationType,
  TiwaniNotification,
} from '../types/notification';
import { formatRelativeTime } from '../utils/formatDate';
import { safeGoBack } from '../utils/navigation';

const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  event: colors.status.info,
  finance: colors.status.success,
  vote: colors.gold.default,
  general: colors.text.secondary,
  marketplace: colors.status.purple,
};

const TYPE_ICONS: Record<NotificationType, string> = {
  event: 'calendar',
  finance: 'credit-card',
  vote: 'check-circle',
  general: 'bell',
  marketplace: 'shopping-bag',
};

interface Section {
  title: string;
  data: TiwaniNotification[];
}

const navigateToTarget = (navigation: any, target?: NotificationTarget) => {
  if (!target) {
    return;
  }
  if (target.route === 'event_detail') {
    navigation.navigate('Events', {
      screen: 'EventDetail',
      params: { eventId: target.eventId },
    });
    return;
  }
  if (target.route === 'poll_vote') {
    navigation.navigate('Voting', {
      screen: 'PollVote',
      params: { pollId: target.pollId },
    });
    return;
  }
  if (target.route === 'election_ballot') {
    navigation.navigate('Voting', {
      screen: 'ElectionBallot',
      params: { electionId: target.electionId },
    });
    return;
  }
  if (target.route === 'my_ledger') {
    navigation.navigate('Finance', {
      screen: 'MyLedger',
      params: { memberId: target.memberId },
    });
    return;
  }
  if (target.route === 'marketplace') {
    navigation.navigate('Market');
    return;
  }
  if (target.route === 'library') {
    navigation.navigate('Library');
  }
};

const NotificationsScreen = ({navigation}: any) => {
  const {error, loading, markAllRead, markRead, notifications, readIds} = useNotifications();
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const sections = useMemo<Section[]>(() => {
    const unread = notifications.filter(item => !readIds.includes(item.id));
    const read = notifications.filter(item => readIds.includes(item.id));
    return [
      ...(unread.length > 0 ? [{title: 'New', data: unread}] : []),
      ...(read.length > 0 ? [{title: 'Earlier', data: read}] : []),
    ];
  }, [notifications, readIds]);

  const handlePress = async (item: TiwaniNotification) => {
    await markRead(item.id);
    navigateToTarget(navigation, item.target);
  };

  const handleMarkAllRead = async () => {
    try {
      setMarkingAllRead(true);
      await markAllRead();
    } catch (markError) {
      Alert.alert(
        'Notifications not updated',
        markError instanceof Error ? markError.message : 'Please try again.',
      );
    } finally {
      setMarkingAllRead(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Notifications"
        showBack
        onBack={() => safeGoBack(navigation, 'DashboardHome')}
        rightElement={
          <TouchableOpacity
            style={styles.markButton}
            onPress={handleMarkAllRead}
            disabled={markingAllRead || notifications.length === 0}>
            <Text style={[styles.markText, (markingAllRead || notifications.length === 0) && styles.disabledText]}>
              {markingAllRead ? 'Saving' : 'Read'}
            </Text>
          </TouchableOpacity>
        }
      />
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        renderSectionHeader={({section}) => (
          <Text style={styles.sectionLabel}>{section.title.toUpperCase()}</Text>
        )}
        renderItem={({item}) => {
          const isRead = readIds.includes(item.id);
          const color = NOTIFICATION_COLORS[item.type];
          return (
            <TouchableOpacity
              style={[styles.card, {borderLeftColor: color}, isRead && styles.read]}
              onPress={() => handlePress(item)}
              activeOpacity={0.8}>
              <View style={[styles.iconBox, {backgroundColor: `${color}22`}]}>
                <Icon name={TYPE_ICONS[item.type]} color={color} size={15} />
              </View>
              <View style={styles.itemContent}>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>{item.title}</Text>
                  {item.target && (
                    <Icon name="chevron-right" color={colors.text.tertiary} size={16} />
                  )}
                </View>
                <Text style={styles.body}>{item.body}</Text>
                <Text style={styles.time}>{formatRelativeTime(item.sentAt)}</Text>
              </View>
              {!isRead && <View style={[styles.unreadDot, {backgroundColor: color}]} />}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="!"
            title={error ? 'Notifications unavailable' : 'All caught up'}
            message={error ?? 'You have no notifications.'}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.bg.secondary},
  content: {padding: spacing.lg, gap: spacing.md},
  markButton: {minHeight: 48, justifyContent: 'center'},
  markText: {color: colors.gold.default, fontWeight: typography.weight.bold},
  disabledText: {opacity: 0.5},
  sectionLabel: {
    marginTop: spacing.sm,
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.8,
  },
  card: {
    minHeight: 86,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    borderLeftWidth: 4,
    backgroundColor: colors.bg.card,
  },
  read: {opacity: 0.65},
  iconBox: {width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center'},
  itemContent: {flex: 1, gap: spacing.xs},
  titleRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  title: {flex: 1, fontSize: typography.size.base, fontWeight: typography.weight.bold, color: colors.text.primary},
  body: {fontSize: typography.size.sm, color: colors.text.secondary},
  time: {fontSize: typography.size.xs, color: colors.text.tertiary},
  unreadDot: {width: 8, height: 8, borderRadius: 4, marginTop: spacing.sm},
});

export default NotificationsScreen;
