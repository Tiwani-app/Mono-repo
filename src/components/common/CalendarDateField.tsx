import React, { useMemo, useState } from "react";
import {
  FlatList,
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
  addYears,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isValid,
  parse,
  setMonth,
  setYear,
  startOfMonth,
  startOfWeek,
  subMonths,
  subYears,
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
const monthLabels = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

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
  const [showYearPicker, setShowYearPicker] = useState(false);

  const days = useMemo(() => {
    const monthStart = startOfMonth(visibleMonth);
    return eachDayOfInterval({
      start: startOfWeek(monthStart),
      end: endOfWeek(endOfMonth(monthStart)),
    });
  }, [visibleMonth]);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const selectedYear = selectedDate.getFullYear();
    const startYear = Math.min(selectedYear - 100, currentYear - 100);
    const endYear = Math.max(selectedYear + 20, currentYear + 10);
    return Array.from(
      { length: endYear - startYear + 1 },
      (_, index) => endYear - index,
    );
  }, [selectedDate]);

  const openCalendar = () => {
    setVisibleMonth(startOfMonth(selectedDate));
    setShowYearPicker(false);
    setOpen(true);
  };

  const selectDate = (date: Date) => {
    onChange(format(date, "yyyy-MM-dd"));
    setShowYearPicker(false);
    setOpen(false);
  };

  const handleSelectYear = (year: number) => {
    setVisibleMonth((current) => startOfMonth(setYear(current, year)));
    setShowYearPicker(false);
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
                onPress={() =>
                  setVisibleMonth(
                    showYearPicker
                      ? subYears(visibleMonth, 12)
                      : subYears(visibleMonth, 1),
                  )
                }
                activeOpacity={0.8}
              >
                <Icon
                  name={showYearPicker ? "chevrons-left" : "chevron-left"}
                  size={20}
                  color={colors.text.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.monthTitleButton}
                onPress={() => setShowYearPicker((current) => !current)}
                activeOpacity={0.8}
              >
                <Text style={styles.monthTitle}>
                  {showYearPicker
                    ? `Select Year (${format(visibleMonth, "yyyy")})`
                    : format(visibleMonth, "MMMM yyyy")}
                </Text>
                <Text style={styles.monthSubtitle}>
                  {showYearPicker
                    ? "Tap a year, then pick the day"
                    : "Tap month/year to jump years"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() =>
                  setVisibleMonth(
                    showYearPicker
                      ? addYears(visibleMonth, 12)
                      : addYears(visibleMonth, 1),
                  )
                }
                activeOpacity={0.8}
              >
                <Icon
                  name={showYearPicker ? "chevrons-right" : "chevron-right"}
                  size={20}
                  color={colors.text.primary}
                />
              </TouchableOpacity>
            </View>

            {showYearPicker ? (
              <>
                <View style={styles.monthQuickRow}>
                  {monthLabels.map((monthLabel, index) => {
                    const selected = visibleMonth.getMonth() === index;
                    return (
                      <TouchableOpacity
                        key={monthLabel}
                        style={[
                          styles.monthQuickButton,
                          selected && styles.selectedMonthQuickButton,
                        ]}
                        onPress={() =>
                          setVisibleMonth((current) =>
                            startOfMonth(setMonth(current, index)),
                          )
                        }
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.monthQuickText,
                            selected && styles.selectedMonthQuickText,
                          ]}
                        >
                          {monthLabel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <FlatList
                  data={years}
                  keyExtractor={(item) => String(item)}
                  numColumns={3}
                  contentContainerStyle={styles.yearList}
                  columnWrapperStyle={styles.yearRow}
                  initialScrollIndex={Math.max(
                    0,
                    years.findIndex((item) => item === visibleMonth.getFullYear()),
                  )}
                  getItemLayout={(_, index) => ({
                    length: 52,
                    offset: 52 * index,
                    index,
                  })}
                  renderItem={({ item }) => {
                    const selected = item === visibleMonth.getFullYear();
                    return (
                      <TouchableOpacity
                        style={[
                          styles.yearButton,
                          selected && styles.selectedYearButton,
                        ]}
                        onPress={() => handleSelectYear(item)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.yearText,
                            selected && styles.selectedYearText,
                          ]}
                        >
                          {item}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </>
            ) : (
              <>
                <View style={styles.yearJumpRow}>
                  <TouchableOpacity
                    style={styles.jumpButton}
                    onPress={() => setVisibleMonth(subYears(visibleMonth, 10))}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.jumpButtonText}>-10Y</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.jumpButton}
                    onPress={() => setVisibleMonth(subMonths(visibleMonth, 1))}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.jumpButtonText}>Prev</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.jumpButton}
                    onPress={() => setVisibleMonth(addMonths(visibleMonth, 1))}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.jumpButtonText}>Next</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.jumpButton}
                    onPress={() => setVisibleMonth(addYears(visibleMonth, 10))}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.jumpButtonText}>+10Y</Text>
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
              </>
            )}
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
  monthTitleButton: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  monthTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
    textAlign: "center",
  },
  monthSubtitle: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    textAlign: "center",
  },
  yearJumpRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  jumpButton: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.tertiary,
  },
  jumpButtonText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.text.secondary,
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
  selectedDayText: {
    color: colors.text.onGold,
    fontWeight: typography.weight.black,
  },
  monthQuickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  monthQuickButton: {
    width: "24%",
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.tertiary,
  },
  selectedMonthQuickButton: {
    borderColor: colors.gold.default,
    backgroundColor: `${colors.gold.default}18`,
  },
  monthQuickText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.text.secondary,
  },
  selectedMonthQuickText: {
    color: colors.gold.light,
  },
  yearList: {
    paddingTop: spacing.xs,
    maxHeight: 280,
  },
  yearRow: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  yearButton: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.tertiary,
  },
  selectedYearButton: {
    borderColor: colors.gold.default,
    backgroundColor: `${colors.gold.default}18`,
  },
  yearText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.text.secondary,
  },
  selectedYearText: {
    color: colors.gold.light,
  },
});

export default CalendarDateField;
