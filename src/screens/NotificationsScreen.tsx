import React from 'react';
import {FlatList, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from '../components/common/FeatherIcon';
import {SafeAreaView} from 'react-native-safe-area-context';
import EmptyState from '../components/common/EmptyState';
import ScreenHeader from '../components/common/ScreenHeader';
import {useNotifications} from '../hooks/useNotifications';
import {colors, spacing, typography} from '../theme';
import {NotificationType} from '../types/notification';
import {formatRelativeTime} from '../utils/formatDate';

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

const NotificationsScreen = ({navigation}: any) => {
  const {markAllRead, notifications, readIds} = useNotifications();

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Notifications"
        showBack
        onBack={navigation.goBack}
        rightElement={
          <TouchableOpacity style={styles.markButton} onPress={markAllRead}>
            <Text style={styles.markText}>Read</Text>
          </TouchableOpacity>
        }
      />
      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        renderItem={({item}) => {
          const isRead = readIds.includes(item.id);
          const color = NOTIFICATION_COLORS[item.type];
          return (
            <View style={[styles.card, {borderLeftColor: color}, isRead && styles.read]}>
              <View style={[styles.iconBox, {backgroundColor: `${color}22`}]}>
                <Icon name={TYPE_ICONS[item.type]} color={color} size={15} />
              </View>
              <View style={styles.itemContent}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
                <Text style={styles.time}>{formatRelativeTime(item.sentAt)}</Text>
              </View>
              {!isRead && <View style={[styles.unreadDot, {backgroundColor: color}]} />}
            </View>
          );
        }}
        ListEmptyComponent={<EmptyState icon="🔔" title="All caught up" message="You have no notifications." />}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.bg.secondary},
  content: {padding: spacing.lg, gap: spacing.md},
  markButton: {minHeight: 48, justifyContent: 'center'},
  markText: {color: colors.gold.default, fontWeight: typography.weight.bold},
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
  title: {fontSize: typography.size.base, fontWeight: typography.weight.bold, color: colors.text.primary},
  body: {fontSize: typography.size.sm, color: colors.text.secondary},
  time: {fontSize: typography.size.xs, color: colors.text.tertiary},
  unreadDot: {width: 8, height: 8, borderRadius: 4, marginTop: spacing.sm},
});

export default NotificationsScreen;
