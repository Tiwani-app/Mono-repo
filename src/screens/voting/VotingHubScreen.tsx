import React from "react";
import {
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
import { colors, spacing, typography } from "../../theme";
import { Election, Poll } from "../../types/voting";
import { formatDisplayDate } from "../../utils/formatDate";
import { canViewElectionResults, isAdmin } from "../../utils/roleGuard";
import { isVotingItemExpired, votingDisplayStatus } from "../../utils/votingExpiry";

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
              polls.map((poll) => (
                <PollCard
                  key={poll.id}
                  admin={admin}
                  poll={poll}
                  onEdit={() =>
                    navigation.navigate("PollForm", { pollId: poll.id })
                  }
                  onOpen={() =>
                    navigation.navigate("PollVote", { pollId: poll.id })
                  }
                />
              ))
            )}
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
              elections.map((election) => (
                <ElectionCard
                  key={election.id}
                  admin={admin}
                  election={election}
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
              ))
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
  onEdit,
  onOpen,
  poll,
}: {
  admin: boolean;
  poll: Poll;
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
        Expires {formatDisplayDate(poll.expiresAt)}
      </Text>
    )}
    {admin && poll.status !== "closed" && !isVotingItemExpired(poll) && (
      <OutlineButton label="Edit Poll" onPress={onEdit} fullWidth />
    )}
  </TouchableOpacity>
);

const ElectionCard = ({
  admin,
  election,
  onEdit,
  onOpen,
  onResults,
  showResults,
}: {
  admin: boolean;
  election: Election;
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
        Expires {formatDisplayDate(election.expiresAt)}
      </Text>
    )}
    {admin && election.status !== "closed" && !isVotingItemExpired(election) && (
      <OutlineButton label="Edit Election" onPress={onEdit} fullWidth />
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
