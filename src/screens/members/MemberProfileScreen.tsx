import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Avatar from "../../components/common/Avatar";
import Badge from "../../components/common/Badge";
import EmptyState from "../../components/common/EmptyState";
import Icon from "../../components/common/FeatherIcon";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ScreenHeader from "../../components/common/ScreenHeader";
import BalanceBanner from "../../components/finance/BalanceBanner";
import { getMember } from "../../services/membersService";
import { useAuthStore } from "../../store/authStore";
import { colors, spacing, typography } from "../../theme";
import { User } from "../../types/user";
import { formatDisplayDate } from "../../utils/formatDate";
import { getInitials } from "../../utils/getInitials";
import {
  canViewMemberPrivateDetails,
  getVisibleMemberProfileTabs,
  sanitizeMemberProfile,
} from "../../utils/memberPrivacy";
import { safeGoBack } from "../../utils/navigation";
import { isAdmin } from "../../utils/roleGuard";

const MemberProfileScreen = ({ navigation, route }: any) => {
  const memberId = route.params?.memberId as string | undefined;
  const [member, setMember] = useState<User | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "family" | "finance">(
    "info",
  );
  const { user } = useAuthStore();

  useEffect(() => {
    setLoadError(null);
    if (!memberId) {
      setLoadError("This profile could not be found.");
      return;
    }
    getMember(memberId)
      .then(setMember)
      .catch((error) =>
        setLoadError(
          error instanceof Error
            ? error.message
            : "Could not load this profile.",
        ),
      );
  }, [memberId]);

  if (loadError) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Profile"
          showBack
          onBack={() => safeGoBack(navigation, "MembersList")}
        />
        <EmptyState
          icon="!"
          title="Profile unavailable"
          message={loadError}
          actionLabel="Back to Members"
          onAction={() => safeGoBack(navigation, "MembersList")}
        />
      </SafeAreaView>
    );
  }

  if (!member) {
    return <LoadingSpinner />;
  }

  const canViewPrivate = canViewMemberPrivateDetails(user, member);
  const canEditMember = isAdmin(user);
  const profile = sanitizeMemberProfile(member);
  const tabs = getVisibleMemberProfileTabs(user, member);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Profile"
        showBack
        onBack={() => safeGoBack(navigation, "MembersList")}
        rightElement={
          canEditMember ? (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() =>
                navigation.navigate("MemberForm", { memberId: member.uid })
              }
              activeOpacity={0.85}
            >
              <Icon name="edit-2" size={18} color={colors.text.onGold} />
            </TouchableOpacity>
          ) : null
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Avatar
            initials={getInitials(profile.displayName)}
            photoURL={member.photoURL}
            size={64}
            statusDot={member.financialStatus}
          />
          <Text style={styles.name}>{profile.displayName}</Text>
          <View style={styles.badgeRow}>
            <Badge
              label={member.role.replace("_", " ").toUpperCase()}
              color={colors.gold.default}
            />
            <Badge
              label={
                profile.memberSince
                  ? `SINCE ${profile.memberSince.getFullYear()}`
                  : "SINCE UNKNOWN"
              }
              color={colors.text.secondary}
            />
          </View>
          <View
            style={[
              styles.statusBanner,
              {
                backgroundColor: `${member.financialStatus === "green" ? colors.status.success : colors.status.error}18`,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    member.financialStatus === "green"
                      ? colors.status.success
                      : colors.status.error,
                },
              ]}
            >
              {member.financialStatus === "green"
                ? "IN GOOD STANDING"
                : "DUES OVERDUE"}
            </Text>
          </View>
        </View>
        <View style={styles.tabs}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.activeTabText,
                ]}
              >
                {tab.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {activeTab === "info" && (
          <View style={styles.card}>
            <Info label="Phone" value={profile.phone} />
            <Info label="Email" value={profile.email} />
            {canViewPrivate && <Info label="Address" value={profile.address} />}
            {canViewPrivate && (
              <Info label="Marital Status" value={profile.maritalStatus} />
            )}
            <Info
              label="Member Since"
              value={
                profile.memberSince
                  ? formatDisplayDate(profile.memberSince)
                  : "Not provided"
              }
            />
          </View>
        )}
        {activeTab === "family" && canViewPrivate && (
          <View style={styles.card}>
            {member.maritalStatus === "married" && profile.spouseName && (
              <Info label="Spouse" value={profile.spouseName} />
            )}
            {profile.children.length === 0 ? (
              <Text style={styles.emptyText}>No children recorded.</Text>
            ) : (
              profile.children.map((child) => (
                <Info
                  key={child.name}
                  label={child.name}
                  value={child.dateOfBirth}
                />
              ))
            )}
          </View>
        )}
        {activeTab === "finance" &&
          (canViewPrivate ? (
            <BalanceBanner outstanding={member.outstandingBalance} />
          ) : (
            <Text style={styles.restricted}>
              You do not have permission to view this information.
            </Text>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const Info = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  content: { padding: spacing.lg, gap: spacing.lg },
  hero: {
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: 8,
    backgroundColor: colors.bg.card,
  },
  name: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
  },
  badgeRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  statusBanner: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  statusText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.6,
  },
  tabs: {
    flexDirection: "row",
    borderRadius: 8,
    backgroundColor: colors.bg.card,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },
  activeTab: { backgroundColor: colors.gold.default },
  tabText: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    fontWeight: typography.weight.bold,
  },
  activeTabText: { color: colors.text.onGold },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    backgroundColor: colors.bg.card,
  },
  infoRow: { gap: spacing.xs },
  infoLabel: { fontSize: typography.size.xs, color: colors.text.secondary },
  infoValue: { fontSize: typography.size.base, color: colors.text.primary },
  emptyText: { color: colors.text.secondary },
  restricted: { color: colors.status.error, textAlign: "center" },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.gold.default,
  },
});

export default MemberProfileScreen;
