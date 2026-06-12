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
import { Election, ElectionVoterState } from "../../types/voting";
import { safeGoBack } from "../../utils/navigation";
import { isElectionBallotComplete } from "../../utils/votingGuards";

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
      await castElectionBallot(electionId, choices, user.uid);
      const nextVoterState = await getElectionVoterState(electionId, user.uid);
      setVoterState(nextVoterState);
      Alert.alert("Ballot recorded", "Your ballot has been saved.");
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

  const canVote = election.status === "open" && !voterState.hasVoted;

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
        </View>
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
          <EmptyState
            icon="✓"
            title={voterState.hasVoted ? "Already voted" : "Voting closed"}
            message={
              voterState.hasVoted
                ? "Your ballot has already been recorded."
                : "This election is not accepting ballots."
            }
          />
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
