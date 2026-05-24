import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Icon from "../common/FeatherIcon";
import Badge from "../common/Badge";
import ProgressBar from "../common/ProgressBar";
import { colors, spacing, typography } from "../../theme";
import { CATEGORY_COLORS, EventStatus, TiwaniEvent } from "../../types/event";
import { formatEventDate, formatEventTime } from "../../utils/formatDate";

const STATUS_COLORS: Record<EventStatus, string> = {
  draft: colors.text.tertiary,
  published: colors.status.success,
  cancelled: colors.status.error,
  completed: colors.text.secondary,
};

interface Props {
  event: TiwaniEvent;
  onPress: () => void;
}

const EventCard = ({ event, onPress }: Props) => {
  const categoryColor = CATEGORY_COLORS[event.category];
  const progress =
    event.capacity > 0 ? event.rsvpList.length / event.capacity : 0;
  const capacityLabel =
    event.capacity > 0
      ? `${event.rsvpList.length}/${event.capacity}`
      : `${event.rsvpList.length}`;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.card, { borderLeftColor: categoryColor }]}
    >
      <View style={styles.topRow}>
        <Badge label={event.category.toUpperCase()} color={categoryColor} />
        <View style={styles.badgeGroup}>
          {event.status !== "published" && (
            <Badge label={event.status.toUpperCase()} color={STATUS_COLORS[event.status]} />
          )}
          <Text style={styles.count}>{capacityLabel}</Text>
        </View>
      </View>
      <Text style={styles.title}>{event.title}</Text>
      <View style={styles.metaRow}>
        <Icon name="clock" size={14} color={colors.text.secondary} />
        <Text style={styles.meta}>
          {formatEventDate(event.dateTime)} · {formatEventTime(event.dateTime)}
        </Text>
      </View>
      <View style={styles.metaRow}>
        <Icon name="map-pin" size={14} color={colors.text.secondary} />
        <Text style={styles.meta}>{event.location}</Text>
      </View>
      {event.capacity > 0 && (
        <ProgressBar value={progress} color={categoryColor} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.bg.card,
    borderRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: colors.border.subtle,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  badgeGroup: { alignItems: "flex-end", gap: spacing.xs },
  title: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  meta: {
    flex: 1,
    fontSize: typography.size.base,
    color: colors.text.secondary,
  },
  count: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    fontWeight: typography.weight.semibold,
  },
});

export default EventCard;
