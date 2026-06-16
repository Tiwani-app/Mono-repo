import React, { useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "../components/common/FeatherIcon";
import Badge from "../components/common/Badge";
import EmptyState from "../components/common/EmptyState";
import GoldButton from "../components/common/GoldButton";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ScreenHeader from "../components/common/ScreenHeader";
import SyncStatusBanner from "../components/common/SyncStatusBanner";
import AdminListingCard from "../components/marketplace/AdminListingCard";
import ListingCard from "../components/marketplace/ListingCard";
import { useMarketplace } from "../hooks/useMarketplace";
import { useAuthStore } from "../store/authStore";
import { colors, spacing, typography } from "../theme";
import {
  canManageMarketplaceListings,
  marketplaceListingSlotsUsed,
  visibleMarketplaceListings,
} from "../utils/marketplaceGuards";

const MarketplaceScreen = ({ navigation }: any) => {
  const [tab, setTab] = useState<"browse" | "manage">("browse");
  const { user } = useAuthStore();
  const admin = canManageMarketplaceListings(user);
  const { error, lastSyncedAt, listings, loading, syncState } =
    useMarketplace(admin);
  const visibleListings = visibleMarketplaceListings(listings);
  const displayedListings =
    tab === "manage" && admin ? listings : visibleListings;
  const listingSlotsUsed = marketplaceListingSlotsUsed(listings);

  const handleAddListing = async () => {
    navigation.navigate("ListingForm");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Marketplace"
        rightElement={
          admin ? (
            <Badge
              label={`${listingSlotsUsed} ACTIVE`}
              color={colors.gold.default}
            />
          ) : null
        }
      />
      <View style={styles.tabs}>
        <Tab
          label="Browse"
          active={tab === "browse"}
          onPress={() => setTab("browse")}
        />
        {admin && (
          <Tab
            label="Manage"
            active={tab === "manage"}
            onPress={() => setTab("manage")}
          />
        )}
      </View>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={displayedListings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <>
              <SyncStatusBanner state={syncState} lastSyncedAt={lastSyncedAt} />
              <View style={styles.infoBanner}>
                <Icon name="tag" size={18} color={colors.gold.light} />
                <Text style={styles.infoText}>
                  {tab === "browse"
                    ? "Items listed by association members & admin. Enquire directly to arrange."
                    : "Admins can manage active, sold, and archived marketplace listings."}
                </Text>
              </View>
            </>
          }
          renderItem={({ item }) =>
            tab === "manage" ? (
              <AdminListingCard
                listing={item}
                onEdit={() =>
                  navigation.navigate("ListingForm", { listingId: item.id })
                }
              />
            ) : (
              <ListingCard listing={item} />
            )
          }
          ListFooterComponent={
            admin && tab === "manage" ? (
              <GoldButton
                label="Add New Listing"
                onPress={handleAddListing}
                fullWidth
              />
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="!"
              title={error ? "Could not load listings" : "Nothing for sale"}
              message={
                error ??
                (tab === "manage"
                  ? "Listings will appear here once they are created."
                  : "The admin hasn't listed any items yet.")
              }
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const Tab = ({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.tab, active && styles.activeTab]}
    onPress={onPress}
  >
    <Text style={[styles.tabText, active && styles.activeTabText]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  tabs: {
    flexDirection: "row",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  tab: {
    minHeight: 42,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  activeTab: {
    borderColor: colors.gold.default,
    backgroundColor: `${colors.gold.default}18`,
  },
  tabText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontWeight: typography.weight.bold,
  },
  activeTabText: { color: colors.gold.light },
  content: { padding: spacing.lg, gap: spacing.md },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  infoText: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});

export default MarketplaceScreen;
