import React, { useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Avatar from "../../components/common/Avatar";
import Badge from "../../components/common/Badge";
import EmptyState from "../../components/common/EmptyState";
import GoldButton from "../../components/common/GoldButton";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import OutlineButton from "../../components/common/OutlineButton";
import ScreenHeader from "../../components/common/ScreenHeader";
import {
  checkInAttendee,
  getEvent,
  getEventAttendees,
} from "../../services/eventsService";
import { useAuthStore } from "../../store/authStore";
import { colors, spacing, typography } from "../../theme";
import { EventAttendee, TiwaniEvent } from "../../types/event";
import { formatEventDate, formatEventTime } from "../../utils/formatDate";
import { getInitials } from "../../utils/getInitials";
import { safeGoBack } from "../../utils/navigation";
import { isAdmin } from "../../utils/roleGuard";

const EventCheckInScreen = ({ navigation, route }: any) => {
  const eventId = route.params?.eventId as string | undefined;
  const { user } = useAuthStore();
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [event, setEvent] = useState<TiwaniEvent | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingUid, setPendingUid] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    if (!eventId) {
      setLoadError("Event not found.");
      setLoading(false);
      return () => {
        active = false;
      };
    }
    Promise.all([getEvent(eventId), getEventAttendees(eventId)])
      .then(([nextEvent, nextAttendees]) => {
        if (!active) {
          return;
        }
        setEvent(nextEvent);
        setAttendees(nextAttendees);
      })
      .catch(error => {
        if (active) {
          setLoadError(
            error instanceof Error ? error.message : "Could not load attendees.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [eventId]);

  const handleCheckIn = async (attendee: EventAttendee) => {
    if (!eventId || attendee.checkedIn) {
      return;
    }
    try {
      setPendingUid(attendee.uid);
      await checkInAttendee(eventId, attendee.uid);
      setAttendees(await getEventAttendees(eventId));
    } catch (error) {
      Alert.alert(
        "Check-in failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setPendingUid(null);
    }
  };

  if (!isAdmin(user)) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Event Check-In"
          showBack
          onBack={() => safeGoBack(navigation, "EventsList")}
        />
        <EmptyState
          icon="!"
          title="Admin only"
          message="Only admins can check in event attendees."
        />
      </SafeAreaView>
    );
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (loadError || !event) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Event Check-In"
          showBack
          onBack={() => safeGoBack(navigation, "EventsList")}
        />
        <EmptyState
          icon="!"
          title="Check-in unavailable"
          message={loadError ?? "This event could not be found."}
          actionLabel="Back to Events"
          onAction={() => safeGoBack(navigation, "EventsList")}
        />
      </SafeAreaView>
    );
  }

  const checkedInCount = attendees.filter(attendee => attendee.checkedIn).length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Event Check-In"
        showBack
        onBack={() => safeGoBack(navigation, "EventsList")}
      />
      <FlatList
        data={attendees}
        keyExtractor={item => item.uid}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.summary}>
            <Badge label="ADMIN CHECK-IN" color={colors.gold.default} />
            <Text style={styles.title}>{event.title}</Text>
            <Text style={styles.meta}>
              {formatEventDate(event.dateTime)} · {formatEventTime(event.dateTime)}
            </Text>
            <View style={styles.statRow}>
              <Badge label={`${attendees.length} RSVP`} color={colors.gold.default} />
              <Badge label={`${checkedInCount} CHECKED IN`} color={colors.status.success} />
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.attendeeRow}>
            <Avatar
              initials={getInitials(item.fullName)}
              photoURL={item.photoURL}
              size={42}
            />
            <View style={styles.attendeeText}>
              <Text style={styles.attendeeName}>{item.fullName}</Text>
              <Text style={styles.attendeeMeta}>{item.email || "No email"}</Text>
            </View>
            {item.checkedIn ? (
              <OutlineButton label="Checked In" onPress={() => {}} disabled />
            ) : (
              <GoldButton
                label="Check In"
                onPress={() => handleCheckIn(item)}
                loading={pendingUid === item.uid}
                disabled={Boolean(pendingUid)}
                size="sm"
              />
            )}
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="!"
            title="No attendees"
            message="RSVP attendees will appear here for check-in."
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  content: { padding: spacing.lg, gap: spacing.md },
  summary: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  title: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
  },
  meta: { fontSize: typography.size.sm, color: colors.text.secondary },
  statRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  attendeeRow: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  attendeeText: { flex: 1, gap: spacing.xs },
  attendeeName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  attendeeMeta: { fontSize: typography.size.sm, color: colors.text.secondary },
});

export default EventCheckInScreen;
