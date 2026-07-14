import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Badge from "../../components/common/Badge";
import EmptyState from "../../components/common/EmptyState";
import FeedbackModal, { FeedbackModalType } from "../../components/common/FeedbackModal";
import Icon from "../../components/common/FeatherIcon";
import GoldButton from "../../components/common/GoldButton";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import OutlineButton from "../../components/common/OutlineButton";
import ScreenHeader from "../../components/common/ScreenHeader";
import {
  cancelEvent,
  getEvent,
  getEventAttendees,
  toggleRsvp,
} from "../../services/eventsService";
import { useAuthStore } from "../../store/authStore";
import { colors, spacing, typography } from "../../theme";
import {
  CATEGORY_COLORS,
  EventAttendee,
  EventStatus,
  TiwaniEvent,
} from "../../types/event";
import {
  getMapsSearchUrl,
  getMeetingLinkLabel,
} from "../../utils/eventLinks";
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
  const eventId = route.params?.eventId as string | undefined;
  const [event, setEvent] = useState<TiwaniEvent | null>(null);
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rsvpPending, setRsvpPending] = useState(false);
  const [cancelPending, setCancelPending] = useState(false);
  const { user } = useAuthStore();
  const [modal, setModal] = useState<{
    visible: boolean;
    type: FeedbackModalType;
    title: string;
    message: string;
    primaryLabel?: string;
    onPrimary: () => void;
    secondaryLabel?: string;
    onSecondary?: () => void;
  } | null>(null);
  const closeModal = () => setModal(null);

  // Refetches whenever the screen regains focus (e.g. returning from the
  // edit form) so changes appear without a manual reload.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoadError(null);
      if (!eventId) {
        setLoadError("This event could not be found.");
        setLoading(false);
        return;
      }
      Promise.all([
        getEvent(eventId),
        getEventAttendees(eventId),
      ])
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
              error instanceof Error
                ? error.message
                : "Could not load this event.",
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
    }, [eventId]),
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  if (loadError || !event) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Event" showBack onBack={() => safeGoBack(navigation, "EventsList")} />
        <EmptyState
          icon="!"
          title="Event unavailable"
          message={loadError ?? "This event could not be found."}
          actionLabel="Back to Events"
          onAction={() => safeGoBack(navigation, "EventsList")}
        />
      </SafeAreaView>
    );
  }

  const isRsvped = user ? event.rsvpList.includes(user.uid) : false;
  const isFull =
    event.capacity > 0 && event.rsvpCount >= event.capacity && !isRsvped;
  const hasElapsed = event.dateTime.getTime() < Date.now();
  const rsvpClosed = event.status !== "published" || hasElapsed;
  const categoryColor = CATEGORY_COLORS[event.category];

  const handleToggleRsvp = async () => {
    if (!user) {
      return;
    }
    try {
      setRsvpPending(true);
      await toggleRsvp(event.id, user.uid);
      const [nextEvent, nextAttendees] = await Promise.all([
        getEvent(event.id),
        getEventAttendees(event.id),
      ]);
      setEvent(nextEvent);
      setAttendees(nextAttendees);
    } catch (error) {
      setModal({ visible: true, type: "error", title: "RSVP not updated", message: error instanceof Error ? error.message : "Please try again.", onPrimary: closeModal });
    } finally {
      setRsvpPending(false);
    }
  };

  const handleOpenMaps = async () => {
    try {
      await Linking.openURL(getMapsSearchUrl(event.location));
    } catch {
      setModal({ visible: true, type: "error", title: "Maps unavailable", message: "This location could not be opened.", onPrimary: closeModal });
    }
  };

  const handleJoinMeeting = async () => {
    const link = event.meetingLink?.trim();
    // Only ever open https links stored on the event.
    if (!link || !link.toLowerCase().startsWith("https://")) {
      setModal({ visible: true, type: "error", title: "Link unavailable", message: "This meeting link could not be opened.", onPrimary: closeModal });
      return;
    }
    try {
      await Linking.openURL(link);
    } catch {
      setModal({ visible: true, type: "error", title: "Link unavailable", message: "This meeting link could not be opened.", onPrimary: closeModal });
    }
  };

  const handleCancelEvent = () => {
    setModal({
      visible: true,
      type: "warning",
      title: "Cancel Event",
      message: "Cancel this event?",
      secondaryLabel: "Keep Event",
      onSecondary: closeModal,
      primaryLabel: "Cancel Event",
      onPrimary: async () => {
        closeModal();
        try {
          setCancelPending(true);
          await cancelEvent(event.id);
          setEvent({ ...event, status: "cancelled" });
        } catch (error) {
          setModal({ visible: true, type: "error", title: "Event not cancelled", message: error instanceof Error ? error.message : "Please try again.", onPrimary: closeModal });
        } finally {
          setCancelPending(false);
        }
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      {modal && (
        <FeedbackModal
          visible={modal.visible}
          type={modal.type}
          title={modal.title}
          message={modal.message}
          primaryLabel={modal.primaryLabel}
          onPrimary={modal.onPrimary}
          secondaryLabel={modal.secondaryLabel}
          onSecondary={modal.onSecondary}
        />
      )}
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
              label={`${event.rsvpCount} GOING`}
              color={colors.status.success}
            />
            {event.capacity > 0 && (
              <Badge
                label={`${Math.max(event.capacity - event.rsvpCount, 0)} SPOTS LEFT`}
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
        {event.location ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>LOCATION</Text>
            <TouchableOpacity
              style={styles.locationRow}
              onPress={handleOpenMaps}
              activeOpacity={0.7}
            >
              <Text style={[styles.infoValue, styles.locationText]}>
                {event.location}
              </Text>
              <Icon name="map-pin" size={16} color={colors.gold.default} />
            </TouchableOpacity>
            <Text style={styles.linkHint}>Tap to open in Maps</Text>
          </View>
        ) : (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>LOCATION</Text>
            <Text style={styles.infoValue}>Online</Text>
          </View>
        )}
        {event.meetingLink && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>ONLINE MEETING</Text>
            <GoldButton
              label={getMeetingLinkLabel(event.meetingLink)}
              onPress={handleJoinMeeting}
              fullWidth
            />
          </View>
        )}
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>ABOUT</Text>
          <Text style={styles.body}>{event.description}</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>ATTENDEES</Text>
          {attendees.length === 0 ? (
            <Text style={styles.body}>No RSVPs yet.</Text>
          ) : (
            <View style={styles.attendeeGrid}>
              {attendees.map(attendee => (
                <View
                  key={attendee.uid}
                  style={[
                    styles.attendeeChip,
                    attendee.checkedIn && styles.checkedInChip,
                  ]}>
                  <Text style={styles.attendeeName} numberOfLines={1}>
                    {attendee.fullName}
                  </Text>
                  {attendee.checkedIn && (
                    <Badge label="IN" color={colors.status.success} />
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
        {rsvpClosed ? (
          <Text style={styles.fullText}>RSVP is not available for this event.</Text>
        ) : isFull ? (
          <Text style={styles.fullText}>This event is full.</Text>
        ) : isRsvped ? (
          <OutlineButton
            label="You're Going!"
            onPress={handleToggleRsvp}
            disabled={rsvpPending}
            fullWidth
          />
        ) : (
          <GoldButton
            label="RSVP to This Event"
            onPress={handleToggleRsvp}
            loading={rsvpPending}
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
            {!hasElapsed && event.status !== "cancelled" && (
              <OutlineButton
                label="Cancel Event"
                onPress={handleCancelEvent}
                color={colors.status.error}
                disabled={cancelPending}
                fullWidth
              />
            )}
            {!hasElapsed && (
              <GoldButton
                label="Check In Attendees"
                onPress={() =>
                  navigation.navigate("EventCheckIn", { eventId: event.id })
                }
                fullWidth
              />
            )}
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
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  locationText: { flex: 1 },
  linkHint: { fontSize: typography.size.xs, color: colors.text.tertiary },
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
  attendeeGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  attendeeChip: {
    maxWidth: "100%",
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.elevated,
  },
  checkedInChip: { borderColor: colors.status.success },
  attendeeName: {
    maxWidth: 180,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  adminActions: { gap: spacing.sm },
});

export default EventDetailScreen;
