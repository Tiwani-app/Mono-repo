import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors, spacing, typography } from "../../theme";
import { FinanceDomain } from "../../types/contributions";

interface Props {
  value: FinanceDomain;
  onChange: (domain: FinanceDomain) => void;
}

const tabs: { label: string; value: FinanceDomain }[] = [
  { label: "Contributions", value: "contributions" },
  { label: "Dues", value: "dues" },
];

const FinanceDomainTabs = ({ value, onChange }: Props) => (
  <View style={styles.row}>
    {tabs.map((tab) => {
      const active = tab.value === value;
      return (
        <TouchableOpacity
          key={tab.value}
          style={[styles.tab, active && styles.tabActive]}
          onPress={() => onChange(tab.value)}
          activeOpacity={0.85}
        >
          <Text style={[styles.label, active && styles.labelActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.xs,
    borderRadius: 10,
    backgroundColor: colors.bg.tertiary,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.gold.default,
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },
  labelActive: {
    color: colors.gold.light,
    fontWeight: typography.weight.bold,
  },
});

export default FinanceDomainTabs;
