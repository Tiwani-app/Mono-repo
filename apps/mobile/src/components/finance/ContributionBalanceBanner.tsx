import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Badge from "../common/Badge";
import { colors, spacing, typography } from "../../theme";
import { formatCurrency } from "../../utils/formatCurrency";

interface Props {
  available: number;
  contributed: number;
  poolName?: string;
  withdrawn: number;
}

const ContributionBalanceBanner = ({
  available,
  contributed,
  poolName,
  withdrawn,
}: Props) => (
  <View style={styles.banner}>
    {poolName ? <Text style={styles.pool}>{poolName}</Text> : null}
    <Text style={styles.label}>AVAILABLE BALANCE</Text>
    <Text style={styles.amount}>{formatCurrency(available)}</Text>
    <View style={styles.metaRow}>
      <Badge
        label={`IN ${formatCurrency(contributed)}`}
        color={colors.status.success}
      />
      <Badge
        label={`OUT ${formatCurrency(withdrawn)}`}
        color={colors.text.secondary}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  banner: {
    gap: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colors.bg.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  pool: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  label: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  amount: {
    fontSize: typography.size.xxxl,
    fontWeight: typography.weight.black,
    color: colors.gold.light,
  },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});

export default ContributionBalanceBanner;
