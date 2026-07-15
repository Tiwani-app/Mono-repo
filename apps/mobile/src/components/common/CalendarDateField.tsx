import React, { useRef, useState } from "react";
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
import { format, getDaysInMonth, isValid, parse } from "date-fns";
import Icon from "./FeatherIcon";
import GoldButton from "./GoldButton";
import OutlineButton from "./OutlineButton";
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

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const ROW_HEIGHT = 44;

// Newest first so recent years are at the top; covers DOBs back 120 years and
// expiry dates up to 20 years ahead.
const buildYears = () => {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear + 20;
  return Array.from({ length: 141 }, (_, index) => startYear - index);
};

const YEARS = buildYears();

const PickerColumn = ({
  items,
  onSelect,
  selectedValue,
  title,
}: {
  items: { label: string; value: number }[];
  onSelect: (value: number) => void;
  selectedValue: number;
  title: string;
}) => {
  const listRef = useRef<FlatList>(null);
  const selectedIndex = Math.max(
    0,
    items.findIndex((item) => item.value === selectedValue),
  );

  return (
    <View style={styles.column}>
      <Text style={styles.columnTitle}>{title}</Text>
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => String(item.value)}
        showsVerticalScrollIndicator={false}
        style={styles.columnList}
        initialScrollIndex={Math.max(0, selectedIndex - 2)}
        getItemLayout={(_, index) => ({
          length: ROW_HEIGHT,
          offset: ROW_HEIGHT * index,
          index,
        })}
        renderItem={({ item }) => {
          const selected = item.value === selectedValue;
          return (
            <TouchableOpacity
              style={[styles.row, selected && styles.selectedRow]}
              onPress={() => onSelect(item.value)}
              activeOpacity={0.8}
            >
              <Text style={[styles.rowText, selected && styles.selectedRowText]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

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
  const [draftYear, setDraftYear] = useState(selectedDate.getFullYear());
  const [draftMonth, setDraftMonth] = useState(selectedDate.getMonth());
  const [draftDay, setDraftDay] = useState(selectedDate.getDate());

  const daysInDraftMonth = getDaysInMonth(new Date(draftYear, draftMonth));
  const safeDraftDay = Math.min(draftDay, daysInDraftMonth);

  const monthItems = MONTH_LABELS.map((monthLabel, index) => ({
    label: monthLabel,
    value: index,
  }));
  const dayItems = Array.from({ length: daysInDraftMonth }, (_, index) => ({
    label: String(index + 1),
    value: index + 1,
  }));
  const yearItems = YEARS.map((year) => ({
    label: String(year),
    value: year,
  }));

  const openPicker = () => {
    setDraftYear(selectedDate.getFullYear());
    setDraftMonth(selectedDate.getMonth());
    setDraftDay(selectedDate.getDate());
    setOpen(true);
  };

  const confirmDate = () => {
    onChange(
      format(new Date(draftYear, draftMonth, safeDraftDay), "yyyy-MM-dd"),
    );
    setOpen(false);
  };

  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.input, error && styles.inputError]}
        onPress={openPicker}
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
            <Text style={styles.modalTitle}>{label}</Text>
            <Text style={styles.modalPreview}>
              {format(
                new Date(draftYear, draftMonth, safeDraftDay),
                "MMMM d, yyyy",
              )}
            </Text>
            <View style={styles.columns}>
              <PickerColumn
                title="MONTH"
                items={monthItems}
                selectedValue={draftMonth}
                onSelect={setDraftMonth}
              />
              <PickerColumn
                title="DAY"
                items={dayItems}
                selectedValue={safeDraftDay}
                onSelect={setDraftDay}
              />
              <PickerColumn
                title="YEAR"
                items={yearItems}
                selectedValue={draftYear}
                onSelect={setDraftYear}
              />
            </View>
            <GoldButton label="Done" onPress={confirmDate} fullWidth />
            <OutlineButton
              label="Cancel"
              onPress={() => setOpen(false)}
              fullWidth
            />
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
  modalTitle: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.text.secondary,
    letterSpacing: 0.8,
  },
  modalPreview: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
  },
  columns: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  column: {
    flex: 1,
    gap: spacing.xs,
  },
  columnTitle: {
    textAlign: "center",
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.text.secondary,
    letterSpacing: 0.6,
  },
  columnList: {
    height: ROW_HEIGHT * 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.tertiary,
  },
  row: {
    height: ROW_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedRow: { backgroundColor: colors.gold.default },
  rowText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  selectedRowText: {
    color: colors.text.onGold,
    fontWeight: typography.weight.black,
  },
});

export default CalendarDateField;