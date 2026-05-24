import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import Badge from "../common/Badge";
import GoldButton from "../common/GoldButton";
import OutlineButton from "../common/OutlineButton";
import {
  deleteListing,
  updateListing,
} from "../../services/marketplaceService";
import { colors, spacing, typography } from "../../theme";
import { Listing, ListingCondition } from "../../types/marketplace";
import { formatCurrency } from "../../utils/formatCurrency";

const CONDITION_LABELS: Record<ListingCondition, string> = {
  new: "New",
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
  used: "Used",
};

interface Props {
  listing: Listing;
  onEdit?: () => void;
}

const AdminListingCard = ({ listing, onEdit }: Props) => {
  const sold = listing.status === "sold";
  const [pendingAction, setPendingAction] = useState<"delete" | "status" | null>(null);

  const runAction = async (
    actionName: "delete" | "status",
    action: () => Promise<void>,
    failureTitle: string,
  ) => {
    try {
      setPendingAction(actionName);
      await action();
    } catch (error) {
      Alert.alert(
        failureTitle,
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setPendingAction(null);
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Listing", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          runAction("delete", () => deleteListing(listing.id), "Listing not deleted"),
      },
    ]);
  };

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.content}>
          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.price}>{formatCurrency(listing.price)}</Text>
          <Text style={styles.condition}>
            {CONDITION_LABELS[listing.condition]} condition
          </Text>
          <Text style={styles.description}>{listing.description}</Text>
        </View>
        <Badge
          label={listing.status.toUpperCase()}
          color={sold ? colors.text.tertiary : colors.status.success}
        />
      </View>
      <View style={styles.actions}>
        {onEdit && (
          <OutlineButton
            label="Edit"
            onPress={onEdit}
            disabled={Boolean(pendingAction)}
          />
        )}
        {sold ? (
          <GoldButton
            label="Mark Available"
            loading={pendingAction === "status"}
            disabled={Boolean(pendingAction)}
            onPress={() =>
              runAction(
                "status",
                () => updateListing(listing.id, { status: "available" }),
                "Listing not updated",
              )
            }
          />
        ) : (
          <OutlineButton
            label="Mark Sold"
            disabled={Boolean(pendingAction)}
            onPress={() =>
              runAction(
                "status",
                () => updateListing(listing.id, { status: "sold" }),
                "Listing not updated",
              )
            }
          />
        )}
        <OutlineButton
          label="Delete"
          onPress={handleDelete}
          color={colors.status.error}
          disabled={Boolean(pendingAction)}
        />
      </View>
    </View>
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
  content: { flex: 1, gap: spacing.xs },
  title: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  price: {
    fontSize: typography.size.base,
    color: colors.gold.light,
    fontWeight: typography.weight.bold,
  },
  condition: { fontSize: typography.size.xs, color: colors.text.tertiary },
  description: { fontSize: typography.size.sm, color: colors.text.secondary },
  actions: { gap: spacing.sm },
});

export default AdminListingCard;
