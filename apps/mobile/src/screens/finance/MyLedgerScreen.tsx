import React, { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Linking, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Avatar from "../../components/common/Avatar";
import Badge from "../../components/common/Badge";
import BalanceBanner from "../../components/finance/BalanceBanner";
import EmptyState from "../../components/common/EmptyState";
import GoldButton from "../../components/common/GoldButton";
import LedgerRow from "../../components/finance/LedgerRow";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import OutlineButton from "../../components/common/OutlineButton";
import ScreenHeader from "../../components/common/ScreenHeader";
import SyncStatusBanner from "../../components/common/SyncStatusBanner";
import { useFinance } from "../../hooks/useFinance";
import { useMembers } from "../../hooks/useMembers";
import {
  getCurrentOrganisationFinanceContact,
  getLedgerCreatorContact,
} from "../../services/organisationService";
import { useAuthStore } from "../../store/authStore";
import { colors, spacing, typography } from "../../theme";
import {
  getFinanceStanding,
  getFinanceStandingBadgeLabel,
  getFinanceStandingColor,
} from "../../utils/financeStanding";
import { FinanceContact } from "../../types/finance";
import { formatCurrency } from "../../utils/formatCurrency";
import { canViewLedgerForMember } from "../../utils/financeGuards";
import { getInitials } from "../../utils/getInitials";
import { getFinanceTotals } from "../../utils/financeTotals";
import { isAdmin, isElectoralChairman } from "../../utils/roleGuard";

const financeQuestionBody = ({
  balance,
  memberId,
  memberName,
  recipientName,
}: {
  balance: number;
  memberId?: string;
  memberName?: string;
  recipientName: string;
}) =>
  `Hello ${recipientName},\n\nI have a question about my outstanding balance of ${formatCurrency(balance)}.\n\nName: ${memberName ?? ""}\nMember ID: ${memberId ?? ""}`;

const openFinanceEmail = async ({
  balance,
  contact,
  memberId,
  memberName,
}: {
  balance: number;
  contact: FinanceContact;
  memberId?: string;
  memberName?: string;
}) => {
  if (!contact.email) {
    throw new Error("Email unavailable");
  }
  const subject = encodeURIComponent("Ledger balance question");
  const body = encodeURIComponent(
    financeQuestionBody({
      balance,
      memberId,
      memberName,
      recipientName: contact.name,
    }),
  );
  const url = `mailto:${contact.email}?subject=${subject}&body=${body}`;
  const supported = await Linking.canOpenURL(url);
  if (!supported) {
    throw new Error("Email unavailable");
  }
  await Linking.openURL(url);
};

const openFinanceSms = async ({
  balance,
  contact,
  memberId,
  memberName,
}: {
  balance: number;
  contact: FinanceContact;
  memberId?: string;
  memberName?: string;
}) => {
  const phone = contact.phone?.replace(/[^\d+]/g, "");
  if (!phone) {
    throw new Error("Phone unavailable");
  }
  const body = encodeURIComponent(
    financeQuestionBody({
      balance,
      memberId,
      memberName,
      recipientName: contact.name,
    }),
  );
  const url = `sms:${phone}&body=${body}`;
  const supported = await Linking.canOpenURL(url);
  if (!supported) {
    throw new Error("Text message unavailable");
  }
  await Linking.openURL(url);
};

const MyLedgerScreen = ({ navigation, route }: any) => {
  const { user } = useAuthStore();
  const [duesCreatorContact, setDuesCreatorContact] =
    useState<FinanceContact | null>(null);
  const [treasurerContact, setTreasurerContact] =
    useState<FinanceContact | null>(null);
  const routeMemberId = route.params?.memberId as string | undefined;
  const adminViewingMember = isAdmin(user) && Boolean(routeMemberId);
  const canViewLedger = canViewLedgerForMember(user, routeMemberId);
  const targetUid = canViewLedger ? (routeMemberId ?? user?.uid) : undefined;
  const { error, lastSyncedAt, ledgerEntries, loading, syncState } =
    useFinance(targetUid);
  const {
    error: membersError,
    loading: membersLoading,
    members,
  } = useMembers({
    enabled: adminViewingMember,
  });
  const selectedMember = members.find((member) => member.uid === targetUid);
  const scopedLedgerEntries = useMemo(
    () =>
      targetUid ? ledgerEntries.filter((entry) => entry.uid === targetUid) : [],
    [ledgerEntries, targetUid],
  );
  const { outstanding, totalCharged, totalPaid } =
    getFinanceTotals(scopedLedgerEntries);
  const canContactFinance =
    user?.role === "member" || isElectoralChairman(user);

  useEffect(() => {
    let active = true;
    if (!canContactFinance || outstanding <= 0 || adminViewingMember) {
      setTreasurerContact(null);
      return;
    }

    getCurrentOrganisationFinanceContact().then((contact) => {
      if (active) {
        setTreasurerContact(contact);
      }
    });

    return () => {
      active = false;
    };
  }, [adminViewingMember, canContactFinance, outstanding]);

  useEffect(() => {
    let active = true;
    if (!canContactFinance || outstanding <= 0 || adminViewingMember) {
      setDuesCreatorContact(null);
      return;
    }

    getLedgerCreatorContact(scopedLedgerEntries).then((contact) => {
      if (active) {
        setDuesCreatorContact(contact);
      }
    });

    return () => {
      active = false;
    };
  }, [adminViewingMember, canContactFinance, outstanding, scopedLedgerEntries]);
  const handleBack = () => {
    if (navigation.canGoBack?.()) {
      navigation.goBack();
      return;
    }

    navigation
      .getParent?.()
      ?.navigate("Dashboard", { screen: "DashboardHome" });
  };
  const openContactRoute = async (
    contact: FinanceContact,
    contactRoute: "email" | "sms",
  ) => {
    try {
      const payload = {
        balance: outstanding,
        contact,
        memberId: targetUid,
        memberName: user?.fullName,
      };
      if (contactRoute === "email") {
        await openFinanceEmail(payload);
        return;
      }
      await openFinanceSms(payload);
    } catch {
      const fallback = contact.email ?? contact.phone ?? "the finance contact";
      Alert.alert("Contact unavailable", `Please contact ${fallback}.`);
    }
  };

  const handleContactFinance = (contact: FinanceContact | null) => {
    if (!contact) {
      Alert.alert(
        "Finance contact unavailable",
        "Please contact an admin to review this balance.",
      );
      return;
    }

    if (contact.email && contact.phone) {
      Alert.alert(`Contact ${contact.name}`, "Choose how to send your message.", [
        { text: "Cancel", style: "cancel" },
        { text: "Email", onPress: () => openContactRoute(contact, "email") },
        { text: "Text Message", onPress: () => openContactRoute(contact, "sms") },
      ]);
      return;
    }

    openContactRoute(contact, contact.email ? "email" : "sms");
  };

  if (loading || (adminViewingMember && membersLoading)) {
    return <LoadingSpinner />;
  }

  if (!canViewLedger) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="My Finances" showBack onBack={handleBack} />
        <EmptyState
          icon="!"
          title="Permission denied"
          message="You can only view your own ledger."
          actionLabel="Back"
          onAction={handleBack}
        />
      </SafeAreaView>
    );
  }

  if (error || (adminViewingMember && membersError)) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title={adminViewingMember ? "Member Finances" : "My Finances"}
          showBack
          onBack={handleBack}
        />
        <EmptyState
          icon="!"
          title="Ledger unavailable"
          message={error ?? membersError ?? "Please try again."}
          actionLabel="Back"
          onAction={handleBack}
        />
      </SafeAreaView>
    );
  }

  const balanceFinancialStatus = adminViewingMember
    ? selectedMember?.financialStatus
    : user?.financialStatus;
  const balanceStanding = getFinanceStanding(
    balanceFinancialStatus,
    outstanding,
  );
  const balanceColor = getFinanceStandingColor(balanceStanding);
  const selectedMemberStanding = selectedMember
    ? getFinanceStanding(selectedMember.financialStatus, outstanding)
    : "clear";

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title={adminViewingMember ? "Member Finances" : "My Finances"}
        showBack
        onBack={handleBack}
      />
      <FlatList
        data={scopedLedgerEntries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <SyncStatusBanner state={syncState} lastSyncedAt={lastSyncedAt} />
            {adminViewingMember && selectedMember && (
              <View style={styles.memberFinanceCard}>
                <View style={styles.memberHeader}>
                  <Avatar
                    initials={getInitials(selectedMember.fullName)}
                    photoURL={selectedMember.photoURL}
                    statusDot={selectedMember.financialStatus}
                    size={52}
                  />
                  <View style={styles.memberCopy}>
                    <Text style={styles.memberName}>
                      {selectedMember.fullName}
                    </Text>
                    <Text style={styles.memberMeta}>
                      {selectedMember.email}
                    </Text>
                    <View style={styles.badgeRow}>
                      <Badge
                        label={getFinanceStandingBadgeLabel(selectedMemberStanding)}
                        color={getFinanceStandingColor(selectedMemberStanding)}
                      />
                      <Badge
                        label={selectedMember.status.toUpperCase()}
                        color={colors.gold.default}
                      />
                    </View>
                  </View>
                </View>
                <View style={styles.financeSummaryRow}>
                  <SummaryStat
                    label="Charged"
                    value={formatCurrency(totalCharged)}
                  />
                  <SummaryStat label="Paid" value={formatCurrency(totalPaid)} />
                  <SummaryStat
                    label="Outstanding"
                    value={formatCurrency(outstanding)}
                    tone={balanceColor}
                  />
                </View>
                <View style={styles.adminActions}>
                  <GoldButton
                    label="Record Payment"
                    onPress={() =>
                      navigation.navigate("RecordPayment", {
                        memberId: selectedMember.uid,
                      })
                    }
                    fullWidth
                  />
                  <OutlineButton
                    label="Add Charge"
                    onPress={() =>
                      navigation.navigate("AdHocCharge", {
                        memberId: selectedMember.uid,
                      })
                    }
                    fullWidth
                  />
                </View>
              </View>
            )}
            <BalanceBanner
              outstanding={outstanding}
              financialStatus={balanceFinancialStatus}
            />
            {outstanding > 0 && !adminViewingMember && canContactFinance && (
              <View style={styles.contactCard}>
                <View style={styles.contactCopy}>
                  <Text style={styles.contactTitle}>
                    Need help with this balance?
                  </Text>
                  <Text style={styles.contactText}>
                    Contact the treasurer for payment support, or contact the
                    dues creator for questions about the charge itself.
                  </Text>
                </View>
                {treasurerContact && (
                  <OutlineButton
                    label={treasurerContact.label}
                    onPress={() => handleContactFinance(treasurerContact)}
                    fullWidth
                  />
                )}
                {duesCreatorContact && (
                  <OutlineButton
                    label={duesCreatorContact.label}
                    onPress={() => handleContactFinance(duesCreatorContact)}
                    fullWidth
                  />
                )}
                {!treasurerContact && !duesCreatorContact && (
                  <Text style={styles.contactText}>
                    Finance contacts have not been configured yet.
                  </Text>
                )}
              </View>
            )}
            <Text style={styles.sectionLabel}>TRANSACTION HISTORY</Text>
          </>
        }
        renderItem={({ item }) => <LedgerRow entry={item} />}
        ListEmptyComponent={
          <EmptyState
            icon="📄"
            title="No transactions"
            message="Your financial history will appear here."
          />
        }
      />
    </SafeAreaView>
  );
};

const SummaryStat = ({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: string;
  value: string;
}) => (
  <View style={styles.summaryStat}>
    <Text style={[styles.summaryValue, tone ? { color: tone } : null]}>
      {value}
    </Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  content: { padding: spacing.lg, gap: spacing.md },
  memberFinanceCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  memberHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  memberCopy: { flex: 1, gap: spacing.xs },
  memberName: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
  },
  memberMeta: { fontSize: typography.size.sm, color: colors.text.secondary },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  financeSummaryRow: { flexDirection: "row", gap: spacing.sm },
  summaryStat: {
    flex: 1,
    minHeight: 70,
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.bg.elevated,
  },
  summaryValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
  },
  summaryLabel: { fontSize: typography.size.xs, color: colors.text.secondary },
  adminActions: { gap: spacing.sm },
  contactCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  contactCopy: { gap: spacing.xs },
  contactTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  contactText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
  sectionLabel: {
    marginTop: spacing.lg,
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.8,
  },
});

export default MyLedgerScreen;
