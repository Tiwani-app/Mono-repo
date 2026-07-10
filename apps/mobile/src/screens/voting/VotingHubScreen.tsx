import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Badge from "../../components/common/Badge";
import EmptyState from "../../components/common/EmptyState";
import GoldButton from "../../components/common/GoldButton";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import OutlineButton from "../../components/common/OutlineButton";
import ScreenHeader from "../../components/common/ScreenHeader";
import SyncStatusBanner from "../../components/common/SyncStatusBanner";
import { useVoting } from "../../hooks/useVoting";
import { useAuthStore } from "../../store/authStore";
import { closeElection, closePoll } from "../../services/votingService";
import { colors, spacing, typography } from "../../theme";
import { Election, Poll } from "../../types/voting";
import { formatVotingExpiryLabel } from "../../utils/dateStatus";
import { canViewElectionResults, isAdmin } from "../../utils/roleGuard";
import {
  isVotingItemExpired,
  partitionExpiredVotingItems,
  votingDisplayStatus,
} from "../../utils/votingExpiry";

const VotingHubScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const admin = isAdmin(user);
  const canViewResults = canViewElectionResults(user);
  const {
    elections,
    error,
    lastSyncedAt,
    loading,
    polls,
    syncState,
  } = useVoting();
  const { active: activeElections, expired: expiredElections } =
    partitionExpiredVotingItems(elections);
  const { active: activePolls, expired: expiredPolls } =
    partitionExpiredVotingItems(polls);

  const [closingId, setClosingId] = useState<string | null>(null);

  const handleClosePoll = (poll: Poll) => {
    Alert.alert(
      "Close Poll",
      `Are you sure you want to close "${poll.title}"? This cannot be undone — voting will end immediately.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Close Poll",
          style: "destructive",
          onPress: async () => {
            setClosingId(poll.id);
            try {
              await closePoll(poll.id);
            } catch (e: any) {
              Alert.alert("Error", e?.message ?? "Could not close the poll. Please try again.");
            } finally {
              setClosingId(null);
            }
          },
        },
      ],
    );
  };

  const handleCloseElection = (election: Election) => {
    Alert.alert(
      "Close Election",
      `Are you sure you want to close "${election.title}"? This cannot be undone — voting will end immediately.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Close Election",
          style: "destructive",
          onPress: async () => {
            setClosingId(election.id);
            try {
              await closeElection(election.id);
            } catch (e: any) {
              Alert.alert("Error", e?.message ?? "Could not close the election. Please try again.");
            } finally {
              setClosingId(null);
            }
          },
        },
      ],
    );
  };

  const renderElection = (election: Election) => (
    <ElectionCard
      key={election.id}
      admin={admin}
      closing={closingId === election.id}
      election={election}
      onClose={() => handleCloseElection(election)}
      onEdit={() =>
        navigation.navigate("ElectionForm", {
          electionId: election.id,
        })
      }
      onOpen={() =>
        navigation.navigate("ElectionBallot", {
          electionId: election.id,
        })
      }
      onResults={() =>
        navigation.navigate("ElectionResults", {
          electionId: election.id,
        })
      }
      showResults={canViewResults}
    />
  );
  const renderPoll = (poll: Poll) => (
    <PollCard
      key={poll.id}
      admin={admin}
      closing={closingId === poll.id}
      poll={poll}
      onClose={() => handleClosePoll(poll)}
      onEdit={() => navigation.navigate("PollForm", { pollId: poll.id })}
      onOpen={() => navigation.navigate("PollVote", { pollId: poll.id })}
    />
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Vote & Polls" />
      <ScrollView contentContainerStyle={styles.content}>
        <SyncStatusBanner state={syncState} lastSyncedAt={lastSyncedAt} />
        {admin && (
          <View style={styles.actionGrid}>
            <GoldButton
              label="New Poll"
              onPress={() => navigation.navigate("PollForm")}
              fullWidth
            />
            <OutlineButton
              label="New Election"
              onPress={() => navigation.navigate("ElectionForm")}
              fullWidth
            />
          </View>
        )}
        {error ? (
          <EmptyState
            icon="!"
            title="Voting data unavailable"
            message={error}
          />
        ) : (
          <>
            <SectionHeader title="ELECTIONS" count={elections.length} />
            {elections.length === 0 ? (
              <EmptyState
                icon="!"
                title="No elections"
                message={
                  admin
                    ? "Create an election to publish candidate slates."
                    : "Elections will appear here when the admins publish them."
                }
              />
            ) : (
              activeElections.map(renderElection)
            )}
            {expiredElections.length > 0 && (
              <>
                <SectionHeader
                  title="EXPIRED ELECTIONS"
                  count={expiredElections.length}
                />
                {expiredElections.map(renderElection)}
              </>
            )}
            <SectionHeader title="POLLS" count={polls.length} />
            {polls.length === 0 ? (
              <EmptyState
                icon="?"
                title="No polls"
                message={
                  admin
                    ? "Create a poll to publish association questions."
                    : "Polls will appear here when the admins publish them."
                }
              />
            ) : (
              activePolls.map(renderPoll)
            )}
            {expiredPolls.length > 0 && (
              <>
                <SectionHeader title="EXPIRED POLLS" count={expiredPolls.length} />
                {expiredPolls.map(renderPoll)}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const SectionHeader = ({ count, title }: { count: number; title: string }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionLabel}>{title}</Text>
    <Badge label={String(count)} color={colors.gold.default} />
  </View>
);

const PollCard = ({
  admin,
  closing,
  onClose,
  onEdit,
  onOpen,
  poll,
}: {
  admin: boolean;
  closing: boolean;
  poll: Poll;
  onClose: () => void;
  onEdit: () => void;
  onOpen: () => void;
}) => (
  <TouchableOpacity
    style={[styles.card, isVotingItemExpired(poll) && styles.expiredCard]}
    onPress={onOpen}
    activeOpacity={0.85}
  >
    <View style={styles.cardHeader}>
      <View style={styles.cardCopy}>
        <Text style={styles.cardTitle}>{poll.title}</Text>
        <Text style={styles.cardMeta}>{poll.question}</Text>
      </View>
      <Badge
        label={votingDisplayStatus(poll).toUpperCase()}
        color={statusColor(votingDisplayStatus(poll))}
      />
    </View>
    <Text style={styles.cardMeta}>
      {poll.options.length} options · {poll.totalVotes} recorded votes
    </Text>
    {poll.expiresAt && (
      <Text style={styles.expiryMeta}>
        {formatVotingExpiryLabel(poll.expiresAt)}
      </Text>
    )}
    {admin && poll.status !== "closed" && !isVotingItemExpired(poll) && (
      <OutlineButton label="Edit Poll" onPress={onEdit} fullWidth />
    )}
    {admin && poll.status === "open" && (
      <OutlineButton
        label={closing ? "Closing…" : "Close Poll"}
        onPress={onClose}
        disabled={closing}
        color={colors.status.error}
        fullWidth
      />
    )}
  </TouchableOpacity>
);

const ElectionCard = ({
  admin,
  closing,
  election,
  onClose,
  onEdit,
  onOpen,
  onResults,
  showResults,
}: {
  admin: boolean;
  closing: boolean;
  election: Election;
  onClose: () => void;
  onEdit: () => void;
  onOpen: () => void;
  onResults: () => void;
  showResults: boolean;
}) => (
  <TouchableOpacity
    style={[styles.card, isVotingItemExpired(election) && styles.expiredCard]}
    onPress={onOpen}
    activeOpacity={0.85}
  >
    <View style={styles.cardHeader}>
      <View style={styles.cardCopy}>
        <Text style={styles.cardTitle}>{election.title}</Text>
        <Text style={styles.cardMeta}>
          {election.races.length} race{election.races.length === 1 ? "" : "s"} ·{" "}
          {election.ballotType} ballot
        </Text>
      </View>
      <Badge
        label={votingDisplayStatus(election).toUpperCase()}
        color={statusColor(votingDisplayStatus(election))}
      />
    </View>
    {election.expiresAt && (
      <Text style={styles.expiryMeta}>
        {formatVotingExpiryLabel(election.expiresAt)}
      </Text>
    )}
    {admin && election.status !== "closed" && !isVotingItemExpired(election) && (
      <OutlineButton label="Edit Election" onPress={onEdit} fullWidth />
    )}
    {admin && election.status === "open" && (
      <OutlineButton
        label={closing ? "Closing…" : "Close Election"}
        onPress={onClose}
        disabled={closing}
        color={colors.status.error}
        fullWidth
      />
    )}
    {showResults && (
      <OutlineButton
        label="View Results & Voter Receipts"
        onPress={onResults}
        fullWidth
      />
    )}
  </TouchableOpacity>
);

const statusColor = (status: "draft" | "open" | "closed" | "expired") =>
  status === "open"
    ? colors.status.success
    : status === "expired"
      ? colors.status.error
    : status === "closed"
      ? colors.text.tertiary
      : colors.gold.default;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  content: { padding: spacing.lg, gap: spacing.md },
  actionGrid: { gap: spacing.sm },
  sectionHeader: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.text.secondary,
    letterSpacing: 0.8,
  },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  expiredCard: {
    borderColor: colors.status.error,
    backgroundColor: `${colors.status.error}10`,
  },
  cardHeader: { flexDirection: "row", gap: spacing.md },
  cardCopy: { flex: 1, gap: spacing.xs },
  cardTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  cardMeta: {
    fontSize: typography.size.sm,
    lineHeight: 20,
    color: colors.text.secondary,
  },
  expiryMeta: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.status.error,
  },
});

export default VotingHubScreen;
