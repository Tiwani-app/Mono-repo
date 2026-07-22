import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Icon from "../common/FeatherIcon";
import Badge from "../common/Badge";
import { colors, spacing, typography } from "../../theme";
import { ContributionEntry } from "../../types/contributions";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDisplayDate } from "../../utils/formatDate";

interface Props {
  entry: ContributionEntry;
}

const ContributionLedgerRow = ({ entry }: Props) => {
  const isContribution = entry.type === "contribution";
  const date = entry.paidAt ?? entry.createdAt;

  return (
    <View style={styles.row}>
      <View
        style={[styles.iconBox, isContribution ? styles.inIcon : styles.outIcon]}
      >
        <Icon
          name={isContribution ? "arrow-down-left" : "arrow-up-right"}
          size={16}
          color={isContribution ? colors.status.success : colors.gold.default}
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>{entry.label}</Text>
        <Text style={styles.date}>
          {date ? formatDisplayDate(date) : "No date"}
        </Text>
      </View>
      <View style={styles.trailing}>
        <Text
          style={[styles.amount, isContribution && styles.contributionAmount]}
        >
          {isContribution ? "+" : "-"}
          {formatCurrency(entry.amount)}
        </Text>
        <Badge
          label={isContribution ? "CONTRIBUTED" : "WITHDRAWN"}
          color={
            isContribution ? colors.status.success : colors.text.secondary
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.bg.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  inIcon: { backgroundColor: `${colors.status.success}18` },
  outIcon: { backgroundColor: `${colors.gold.default}18` },
  content: { flex: 1, gap: spacing.xs },
  label: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  date: { fontSize: typography.size.sm, color: colors.text.secondary },
  trailing: { alignItems: "flex-end", gap: spacing.xs },
  amount: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  contributionAmount: { color: colors.status.success },
});

export default React.memo(ContributionLedgerRow);
