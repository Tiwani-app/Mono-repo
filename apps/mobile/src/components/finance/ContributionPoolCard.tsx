import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Badge from "../common/Badge";
import Icon from "../common/FeatherIcon";
import ProgressBar from "../common/ProgressBar";
import { colors, spacing, typography } from "../../theme";
import { ContributionPool } from "../../types/contributions";
import { formatCurrency } from "../../utils/formatCurrency";

interface Props {
  onClose?: (pool: ContributionPool) => void;
  onPress?: () => void;
  pool: ContributionPool;
}

const ContributionPoolCard = ({ onClose, onPress, pool }: Props) => {
  const statusColor =
    pool.status === "closed" ? colors.text.secondary : colors.gold.default;
  const balance = Math.max(0, pool.totalContributed - pool.totalWithdrawn);
  const progress =
    pool.totalContributed > 0
      ? Math.min(1, pool.totalWithdrawn / pool.totalContributed)
      : 0;

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      disabled={!onPress}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.row}>
        <View style={styles.content}>
          <Text style={styles.name}>{pool.name}</Text>
          <Text style={styles.amount}>
            Pool balance {formatCurrency(balance)}
          </Text>
          {pool.expectedAmount > 0 ? (
            <Text style={styles.meta}>
              Expected {formatCurrency(pool.expectedAmount)} per contribution
            </Text>
          ) : null}
        </View>
        <View style={styles.badgeRow}>
          <Badge label={pool.status.toUpperCase()} color={statusColor} />
          {onClose && pool.status === "active" ? (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => onClose(pool)}
              activeOpacity={0.8}
            >
              <Icon name="x-circle" size={16} color={colors.status.error} />
            </TouchableOpacity>
          ) : null}
          {onPress && !onClose ? (
            <Icon name="chevron-right" size={18} color={colors.text.tertiary} />
          ) : null}
        </View>
      </View>
      <Text style={styles.progressLabel}>
        {pool.contributorCount} contributor
        {pool.contributorCount === 1 ? "" : "s"} ·{" "}
        {formatCurrency(pool.totalContributed)} in ·{" "}
        {formatCurrency(pool.totalWithdrawn)} out
      </Text>
      <ProgressBar value={progress} color={statusColor} />
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
    borderColor: colors.border.subtle,
  },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  badgeRow: { alignItems: "flex-end", gap: spacing.sm },
  content: { flex: 1, gap: spacing.xs },
  name: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  amount: { fontSize: typography.size.sm, color: colors.text.secondary },
  meta: { fontSize: typography.size.xs, color: colors.text.tertiary },
  progressLabel: { fontSize: typography.size.sm, color: colors.text.secondary },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: `${colors.status.error}14`,
  },
});

export default ContributionPoolCard;
