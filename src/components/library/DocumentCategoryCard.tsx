import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Icon from "../common/FeatherIcon";
import { colors, spacing, typography } from "../../theme";

interface Props {
  count: number;
  icon: string;
  label: string;
  onPress: () => void;
  subtitle: string;
}

const DocumentCategoryCard = ({ count, icon, label, onPress, subtitle }: Props) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
    <View style={styles.iconBox}>
      <Icon name={icon} size={20} color={colors.gold.light} />
    </View>
    <Text style={styles.title}>{label}</Text>
    <Text style={styles.subtitle}>{subtitle}</Text>
    <Text style={styles.count}>{count} documents</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 156,
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg.elevated,
  },
  title: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  subtitle: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    lineHeight: 17,
  },
  count: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.gold.light,
  },
});

export default DocumentCategoryCard;
