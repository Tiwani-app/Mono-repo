import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Badge from "../../components/common/Badge";
import GoldButton from "../../components/common/GoldButton";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import OutlineButton from "../../components/common/OutlineButton";
import ScreenHeader from "../../components/common/ScreenHeader";
import { cancelEvent, getEvent, toggleRsvp } from "../../services/eventsService";
import { useAuthStore } from "../../store/authStore";
import { colors, spacing, typography } from "../../theme";
import { CATEGORY_COLORS, EventStatus, TiwaniEvent } from "../../types/event";
import { formatEventDate, formatEventTime } from "../../utils/formatDate";
import { safeGoBack } from "../../utils/navigation";
import { isAdmin } from "../../utils/roleGuard";

const STATUS_COLORS: Record<EventStatus, string> = {
  draft: colors.text.tertiary,
  published: colors.status.success,
  cancelled: colors.status.error,
  completed: colors.text.secondary,
};

const EventDetailScreen = ({ navigation, route }: any) => {
  const [event, setEvent] = useState<TiwaniEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    getEvent(route.params.eventId)
      .then(setEvent)
      .catch(() => Alert.alert("Error", "Could not load this event."))
      .finally(() => setLoading(false));
  }, [route.params.eventId]);

  if (loading || !event) {
    return <LoadingSpinner />;
  }

  const isRsvped = user ? event.rsvpList.includes(user.uid) : false;
  const isFull =
    event.capacity > 0 && event.rsvpList.length >= event.capacity && !isRsvped;
  const rsvpClosed = event.status !== "published";
  const categoryColor = CATEGORY_COLORS[event.category];

  const handleToggleRsvp = async () => {
    if (!user) {
      return;
    }
    try {
      await toggleRsvp(event.id, user.uid);
      setEvent({
        ...event,
        rsvpList: isRsvped
          ? event.rsvpList.filter((uid) => uid !== user.uid)
          : [...event.rsvpList, user.uid],
      });
    } catch {
      Alert.alert("Error", "Could not update your RSVP. Please try again.");
    }
  };

  const handleCancelEvent = () => {
    Alert.alert("Cancel Event", "Cancel this event?", [
      { text: "Keep Event", style: "cancel" },
      {
        text: "Cancel Event",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelEvent(event.id);
            setEvent({ ...event, status: "cancelled" });
          } catch {
            Alert.alert("Error", "Could not cancel this event.");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Event"
        showBack
        onBack={() => safeGoBack(navigation, "EventsList")}
        rightElement={
          <Badge label={event.category.toUpperCase()} color={categoryColor} />
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.badgeRow}>
            <Badge label={event.status.toUpperCase()} color={STATUS_COLORS[event.status]} />
          </View>
          <Text style={styles.title}>{event.title}</Text>
          <View style={styles.badgeRow}>
            <Badge
              label={`${event.rsvpList.length} GOING`}
              color={colors.status.success}
            />
            {event.capacity > 0 && (
              <Badge
                label={`${Math.max(event.capacity - event.rsvpList.length, 0)} SPOTS LEFT`}
                color={colors.gold.default}
              />
            )}
          </View>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>DATE & TIME</Text>
          <Text style={styles.infoValue}>
            {formatEventDate(event.dateTime)} ·{" "}
            {formatEventTime(event.dateTime)}
          </Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>LOCATION</Text>
          <Text style={styles.infoValue}>{event.location}</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>ABOUT</Text>
          <Text style={styles.body}>{event.description}</Text>
        </View>
        {rsvpClosed ? (
          <Text style={styles.fullText}>RSVP is not available for this event.</Text>
        ) : isFull ? (
          <Text style={styles.fullText}>This event is full.</Text>
        ) : isRsvped ? (
          <OutlineButton
            label="You're Going!"
            onPress={handleToggleRsvp}
            fullWidth
          />
        ) : (
          <GoldButton
            label="RSVP to This Event"
            onPress={handleToggleRsvp}
            fullWidth
          />
        )}
        {isAdmin(user) && (
          <View style={styles.adminActions}>
            <OutlineButton
              label="Edit Event"
              onPress={() =>
                navigation.navigate("EventForm", { eventId: event.id })
              }
              fullWidth
            />
            {event.status !== "cancelled" && (
              <OutlineButton
                label="Cancel Event"
                onPress={handleCancelEvent}
                color={colors.status.error}
                fullWidth
              />
            )}
            <GoldButton
              label="Check In Attendees"
              onPress={() =>
                navigation.navigate("EventCheckIn", { eventId: event.id })
              }
              fullWidth
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  content: { padding: spacing.lg, gap: spacing.lg },
  hero: {
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: 8,
    backgroundColor: colors.bg.card,
  },
  title: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
  },
  badgeRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  infoCard: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: 8,
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  infoLabel: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    letterSpacing: 0.6,
  },
  infoValue: { fontSize: typography.size.base, color: colors.text.primary },
  body: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    lineHeight: 21,
  },
  fullText: {
    textAlign: "center",
    color: colors.status.error,
    fontWeight: typography.weight.bold,
  },
  adminActions: { gap: spacing.sm },
});

export default EventDetailScreen;
