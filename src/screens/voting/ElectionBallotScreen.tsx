import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import EmptyState from "../../components/common/EmptyState";
import GoldButton from "../../components/common/GoldButton";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ScreenHeader from "../../components/common/ScreenHeader";
import CandidateCard from "../../components/voting/CandidateCard";
import FinancialGate from "../../components/voting/FinancialGate";
import {
  castElectionBallot,
  getElection,
  getElectionVoterState,
} from "../../services/votingService";
import { useAuthStore } from "../../store/authStore";
import { colors, spacing, typography } from "../../theme";
import { User } from "../../types/user";
import { Election, ElectionVoterState } from "../../types/voting";
import { formatDisplayDate } from "../../utils/formatDate";
import { safeGoBack } from "../../utils/navigation";
import { isAdmin, isElectoralChairman } from "../../utils/roleGuard";
import {
  canAcceptVotingInput,
  isVotingItemExpired,
} from "../../utils/votingExpiry";
import { isElectionBallotComplete } from "../../utils/votingGuards";

const secretBallotInstructions = {
  admin:
    "Create, open, and close the election without collecting voter choices directly. Once voting opens, avoid changing races or candidates unless the election is restarted.",
  electoral_chairman:
    "Supervise the process, answer voting questions, and use ballot receipts or the voter registry for disputes. Do not ask members to disclose their selections.",
  member:
    "Choose one candidate for every race, review your selections, then submit once. Secret ballots separate your voting record from your choices in admin views.",
};

const secretInstructionFor = (user: User | null) => {
  if (isAdmin(user)) {
    return secretBallotInstructions.admin;
  }
  if (isElectoralChairman(user)) {
    return secretBallotInstructions.electoral_chairman;
  }
  return secretBallotInstructions.member;
};

const ElectionBallotScreen = ({ navigation, route }: any) => {
  const electionId = route.params?.electionId as string | undefined;
  const { user } = useAuthStore();
  const [election, setElection] = useState<Election | null>(null);
  const [voterState, setVoterState] = useState<ElectionVoterState | null>(null);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!electionId || !user?.uid) {
      setError("Election not found.");
      setLoading(false);
      return;
    }
    Promise.all([
      getElection(electionId),
      getElectionVoterState(electionId, user.uid),
    ])
      .then(([nextElection, nextVoterState]) => {
        setElection(nextElection);
        setVoterState(nextVoterState);
      })
      .catch((loadError) =>
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load this election.",
        ),
      )
      .finally(() => setLoading(false));
  }, [electionId, user?.uid]);

  const handleSubmit = async () => {
    if (!electionId || !user?.uid || !election) {
      return;
    }
    if (!isElectionBallotComplete(election, choices)) {
      Alert.alert("Ballot incomplete", "Choose a candidate for every race.");
      return;
    }
    try {
      setSubmitting(true);
      const ballotReceipt = await castElectionBallot(
        electionId,
        choices,
        user.uid,
      );
      const nextVoterState = await getElectionVoterState(electionId, user.uid);
      setVoterState({
        ...nextVoterState,
        ballotReceipt: nextVoterState.ballotReceipt ?? ballotReceipt,
        hasVoted: true,
      });
      Alert.alert(
        "Ballot recorded",
        `Your ballot has been saved.\n\nReceipt: ${ballotReceipt}`,
      );
    } catch (submitError) {
      Alert.alert(
        "Ballot not recorded",
        submitError instanceof Error ? submitError.message : "Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (user?.financialStatus === "red") {
    return <FinancialGate showBack />;
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !election || !voterState) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Election"
          showBack
          onBack={() => safeGoBack(navigation, "VotingHub")}
        />
        <EmptyState
          icon="!"
          title="Election unavailable"
          message={error ?? "Could not load this election."}
          actionLabel="Back to Voting"
          onAction={() => safeGoBack(navigation, "VotingHub")}
        />
      </SafeAreaView>
    );
  }

  const expired = isVotingItemExpired(election);
  const canVote = canAcceptVotingInput(election) && !voterState.hasVoted;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Election"
        showBack
        onBack={() => safeGoBack(navigation, "VotingHub")}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <Text style={styles.title}>{election.title}</Text>
          <Text style={styles.meta}>
            {election.ballotType === "secret" ? "Secret ballot" : "Open ballot"}
          </Text>
          <Text style={[styles.meta, expired && styles.expiryMeta]}>
            {expired
              ? "Expired"
              : election.expiresAt
                ? `Voting expires ${formatDisplayDate(election.expiresAt)}`
                : "No expiry date set"}
          </Text>
        </View>
        {election.ballotType === "secret" && (
          <View style={styles.instructionCard}>
            <Text style={styles.instructionTitle}>
              Secret ballot instructions
            </Text>
            <Text style={styles.instructionText}>
              {secretInstructionFor(user)}
            </Text>
          </View>
        )}
        {election.races.map((race) => (
          <View key={race.raceId} style={styles.raceCard}>
            <Text style={styles.office}>{race.office}</Text>
            {race.candidates.map((candidate) => (
              <CandidateCard
                key={candidate.uid ?? candidate.name}
                candidate={candidate}
                selected={choices[race.raceId] === (candidate.uid ?? candidate.name)}
                onPress={() =>
                  canVote &&
                  setChoices((current) => ({
                    ...current,
                    [race.raceId]: candidate.uid ?? candidate.name,
                  }))
                }
              />
            ))}
          </View>
        ))}
        {canVote ? (
          <GoldButton
            label="Submit Ballot"
            onPress={handleSubmit}
            loading={submitting}
            fullWidth
          />
        ) : (
          <>
            <EmptyState
              icon="✓"
              title={voterState.hasVoted ? "Already voted" : "Voting closed"}
              message={
                voterState.hasVoted
                  ? "Your ballot has already been recorded."
                  : expired
                    ? "This election has expired. Results remain available for reference."
                    : "This election is not accepting ballots."
              }
            />
            {voterState.hasVoted && voterState.ballotReceipt && (
              <View style={styles.receiptCard}>
                <Text style={styles.receiptLabel}>BALLOT RECEIPT</Text>
                <Text style={styles.receiptValue}>
                  {voterState.ballotReceipt}
                </Text>
                <Text style={styles.receiptHelp}>
                  Keep this receipt for election records. It proves your ballot
                  was received without showing your secret choices.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  content: { padding: spacing.lg, gap: spacing.md },
  headerCard: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  title: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  meta: {
    fontSize: typography.size.sm,
    color: colors.gold.light,
    fontWeight: typography.weight.semibold,
  },
  expiryMeta: {
    color: colors.status.error,
  },
  instructionCard: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  instructionTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.gold.light,
  },
  instructionText: {
    fontSize: typography.size.sm,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
    color: colors.text.secondary,
  },
  receiptCard: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gold.default,
    backgroundColor: colors.bg.card,
  },
  receiptLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.8,
    color: colors.gold.light,
  },
  receiptValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  receiptHelp: {
    fontSize: typography.size.sm,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
    color: colors.text.secondary,
  },
  raceCard: { gap: spacing.md },
  office: {
    marginTop: spacing.sm,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.5,
  },
});

export default ElectionBallotScreen;
