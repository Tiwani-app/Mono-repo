import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { format, isSameDay } from "date-fns";
import { colors, spacing, typography } from "../../theme";
import { TiwaniEvent } from "../../types/event";
import { getCenteredDateWindow } from "../../utils/eventGuards";

interface Props {
  events: TiwaniEvent[];
  selectedDay: Date | null;
  onDayPress: (day: Date) => void;
}

const WeekStrip = ({ events, selectedDay, onDayPress }: Props) => {
  const today = new Date();
  const days = getCenteredDateWindow(today);

  return (
    <View style={styles.container}>
      {days.map((day) => {
        const selected = selectedDay ? isSameDay(day, selectedDay) : false;
        const isToday = isSameDay(day, today);
        const hasEvent = events.some((event) => isSameDay(event.dateTime, day));
        return (
          <TouchableOpacity
            key={day.toISOString()}
            style={[
              styles.day,
              isToday && !selected && styles.today,
              selected && styles.selectedDay,
            ]}
            onPress={() => onDayPress(day)}
            activeOpacity={0.8}
          >
            <Text style={[styles.letter, selected && styles.selectedText]}>
              {format(day, "EEEEE")}
            </Text>
            <Text style={[styles.number, selected && styles.selectedText]}>
              {format(day, "d")}
            </Text>
            <View
              style={[
                styles.eventDot,
                hasEvent && styles.eventDotActive,
                selected && styles.selectedDot,
              ]}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: "row", gap: spacing.sm },
  day: {
    flex: 1,
    minHeight: 76,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderRadius: 8,
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  selectedDay: {
    backgroundColor: colors.gold.default,
    borderColor: colors.gold.default,
  },
  today: {
    borderColor: colors.gold.default,
  },
  letter: { fontSize: typography.size.xs, color: colors.text.secondary },
  number: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  selectedText: { color: colors.text.onGold },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "transparent",
  },
  eventDotActive: { backgroundColor: colors.gold.light },
  selectedDot: { backgroundColor: colors.text.onGold },
});

export default WeekStrip;
