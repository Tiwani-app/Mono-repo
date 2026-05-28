import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isValid,
  parse,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import Icon from "./FeatherIcon";
import { colors, spacing, typography } from "../../theme";

interface Props {
  allowEmpty?: boolean;
  error?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value?: string;
  style?: ViewStyle;
}

const parseDateValue = (value?: string) => {
  const parsed = value ? parse(value, "yyyy-MM-dd", new Date()) : new Date();
  return isValid(parsed) ? parsed : new Date();
};

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CalendarDateField = ({
  allowEmpty,
  error,
  label,
  onChange,
  placeholder = "Choose date",
  value,
  style,
}: Props) => {
  const hasValue = Boolean(value?.trim());
  const selectedDate = parseDateValue(value);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(selectedDate));

  const days = useMemo(() => {
    const monthStart = startOfMonth(visibleMonth);
    return eachDayOfInterval({
      start: startOfWeek(monthStart),
      end: endOfWeek(endOfMonth(monthStart)),
    });
  }, [visibleMonth]);

  const openCalendar = () => {
    setVisibleMonth(startOfMonth(selectedDate));
    setOpen(true);
  };

  const selectDate = (date: Date) => {
    onChange(format(date, "yyyy-MM-dd"));
    setOpen(false);
  };

  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.input, error && styles.inputError]}
        onPress={openCalendar}
        activeOpacity={0.85}
      >
        <View style={styles.inputCopy}>
          <Text style={styles.inputValue}>
            {hasValue ? format(selectedDate, "MMM d, yyyy") : placeholder}
          </Text>
          <Text style={styles.inputMeta}>
            {hasValue ? format(selectedDate, "yyyy-MM-dd") : "Optional"}
          </Text>
        </View>
        {allowEmpty && hasValue ? (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => onChange("")}
            activeOpacity={0.8}
          >
            <Icon name="x" size={16} color={colors.text.secondary} />
          </TouchableOpacity>
        ) : null}
        <Icon name="calendar" size={19} color={colors.gold.default} />
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.modalCard}>
            <View style={styles.monthRow}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setVisibleMonth(subMonths(visibleMonth, 1))}
                activeOpacity={0.8}
              >
                <Icon
                  name="chevron-left"
                  size={20}
                  color={colors.text.primary}
                />
              </TouchableOpacity>
              <Text style={styles.monthTitle}>
                {format(visibleMonth, "MMMM yyyy")}
              </Text>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setVisibleMonth(addMonths(visibleMonth, 1))}
                activeOpacity={0.8}
              >
                <Icon
                  name="chevron-right"
                  size={20}
                  color={colors.text.primary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
              {weekdays.map((day) => (
                <Text key={day} style={styles.weekday}>
                  {day}
                </Text>
              ))}
            </View>
            <View style={styles.daysGrid}>
              {days.map((day) => {
                const selected = isSameDay(day, selectedDate);
                const inMonth = isSameMonth(day, visibleMonth);
                return (
                  <TouchableOpacity
                    key={day.toISOString()}
                    style={[
                      styles.dayButton,
                      selected && styles.selectedDayButton,
                    ]}
                    onPress={() => selectDate(day)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        !inMonth && styles.outsideDayText,
                        selected && styles.selectedDayText,
                      ]}
                    >
                      {format(day, "d")}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  label: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  input: {
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.tertiary,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  inputCopy: { flex: 1, gap: 2 },
  inputValue: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  inputMeta: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
  },
  clearButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: colors.bg.card,
  },
  inputError: { borderColor: colors.status.error },
  errorText: { fontSize: typography.size.xs, color: colors.status.error },
  backdrop: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
  },
  modalCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  monthRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  iconButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.tertiary,
  },
  monthTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: typography.size.lg,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
  },
  weekRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  weekday: {
    flex: 1,
    textAlign: "center",
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.text.secondary,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: spacing.xs,
  },
  dayButton: {
    width: `${100 / 7}%`,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedDayButton: {
    borderRadius: 8,
    backgroundColor: colors.gold.default,
  },
  dayText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  outsideDayText: { color: colors.text.tertiary },
  selectedDayText: { color: colors.text.onGold },
});

export default CalendarDateField;
