import React, {useMemo, useState} from 'react';
import {FlatList, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from '../../components/common/FeatherIcon';
import {format, isSameDay} from 'date-fns';
import {SafeAreaView} from 'react-native-safe-area-context';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ScreenHeader from '../../components/common/ScreenHeader';
import EventCard from '../../components/events/EventCard';
import WeekStrip from '../../components/events/WeekStrip';
import {useEvents} from '../../hooks/useEvents';
import {useAuthStore} from '../../store/authStore';
import {colors, spacing, typography} from '../../theme';
import {isAdmin} from '../../utils/roleGuard';

const EventsScreen = ({navigation}: any) => {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const {error, events, loading} = useEvents();
  const {user} = useAuthStore();

  const visibleEvents = useMemo(() => {
    if (!selectedDay) {
      return events;
    }
    return events.filter(event => isSameDay(event.dateTime, selectedDay));
  }, [events, selectedDay]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Events"
        rightElement={
          isAdmin(user) ? (
            <TouchableOpacity style={styles.iconButton}>
              <Icon name="plus" size={18} color={colors.gold.default} />
            </TouchableOpacity>
          ) : null
        }
      />
      <View style={styles.content}>
        <View style={styles.monthRow}>
          <Text style={styles.month}>{format(new Date(), 'MMMM yyyy')}</Text>
          <Text style={styles.monthMode}>Month View</Text>
        </View>
        <WeekStrip events={events} selectedDay={selectedDay} onDayPress={setSelectedDay} />
        <Text style={styles.sectionLabel}>UPCOMING</Text>
        {error ? (
          <EmptyState icon="!" title="Something went wrong" message={error} />
        ) : (
          <FlatList
            data={visibleEvents}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            renderItem={({item}) => (
              <EventCard
                event={item}
                onPress={() => navigation.navigate('EventDetail', {eventId: item.id})}
              />
            )}
            ListEmptyComponent={
              <EmptyState
                icon="📅"
                title={selectedDay ? 'No events this day' : 'No upcoming events'}
                message={selectedDay ? 'Select another day or view all events.' : 'Check back later for new events.'}
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.bg.secondary},
  content: {flex: 1, paddingHorizontal: spacing.lg, gap: spacing.lg},
  iconButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  month: {fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.text.primary},
  monthMode: {fontSize: typography.size.sm, color: colors.text.secondary},
  sectionLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.text.secondary,
    letterSpacing: 0.8,
  },
  list: {gap: spacing.md, paddingBottom: spacing.xxl},
});

export default EventsScreen;
