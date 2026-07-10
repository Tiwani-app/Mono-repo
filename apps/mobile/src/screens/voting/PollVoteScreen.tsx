import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import EmptyState from "../../components/common/EmptyState";
import FeedbackModal, { FeedbackModalType } from "../../components/common/FeedbackModal";
import GoldButton from "../../components/common/GoldButton";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ScreenHeader from "../../components/common/ScreenHeader";
import PollOption from "../../components/voting/PollOption";
import FinancialGate from "../../components/voting/FinancialGate";
import {
  castPollVote,
  getPoll,
  getPollVoterState,
} from "../../services/votingService";
import { useAuthStore } from "../../store/authStore";
import { colors, spacing, typography } from "../../theme";
import { Poll, PollVoterState } from "../../types/voting";
import { formatVotingExpiryLabel } from "../../utils/dateStatus";
import { safeGoBack } from "../../utils/navigation";
import { canAcceptVotingInput, isVotingItemExpired } from "../../utils/votingExpiry";

const PollVoteScreen = ({ navigation, route }: any) => {
  const pollId = route.params?.pollId as string | undefined;
  const { user } = useAuthStore();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [voterState, setVoterState] = useState<PollVoterState | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    visible: boolean;
    type: FeedbackModalType;
    title: string;
    message: string;
    primaryLabel?: string;
    onPrimary: () => void;
    secondaryLabel?: string;
    onSecondary?: () => void;
  } | null>(null);
  const closeModal = () => setModal(null);

  useEffect(() => {
    if (!pollId || !user?.uid) {
      setError("Poll not found.");
      setLoading(false);
      return;
    }
    Promise.all([getPoll(pollId), getPollVoterState(pollId, user.uid)])
      .then(([nextPoll, nextVoterState]) => {
        setPoll(nextPoll);
        setVoterState(nextVoterState);
      })
      .catch((loadError) =>
        setError(
          loadError instanceof Error ? loadError.message : "Could not load this poll.",
        ),
      )
      .finally(() => setLoading(false));
  }, [pollId, user?.uid]);

  const selectedOption = useMemo(
    () => poll?.options.find((option) => option.id === selectedOptionId),
    [poll?.options, selectedOptionId],
  );

  const handleVote = async () => {
    if (!pollId || !user?.uid || !selectedOption) {
      setModal({ visible: true, type: "error", title: "Option required", message: "Choose an option before submitting.", onPrimary: closeModal });
      return;
    }
    try {
      setSubmitting(true);
      await castPollVote(pollId, selectedOption.id, user.uid);
      const [nextPoll, nextVoterState] = await Promise.all([
        getPoll(pollId),
        getPollVoterState(pollId, user.uid),
      ]);
      setPoll(nextPoll);
      setVoterState(nextVoterState);
      setModal({ visible: true, type: "success", title: "Vote recorded", message: "Your poll vote has been saved.", onPrimary: closeModal });
    } catch (voteError) {
      setModal({ visible: true, type: "error", title: "Vote not recorded", message: voteError instanceof Error ? voteError.message : "Please try again.", onPrimary: closeModal });
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

  if (error || !poll || !voterState) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Poll"
          showBack
          onBack={() => safeGoBack(navigation, "VotingHub")}
        />
        <EmptyState
          icon="!"
          title="Poll unavailable"
          message={error ?? "Could not load this poll."}
          actionLabel="Back to Voting"
          onAction={() => safeGoBack(navigation, "VotingHub")}
        />
      </SafeAreaView>
    );
  }

  const expired = isVotingItemExpired(poll);
  const closed = poll.status === "closed" || expired;
  const voted = voterState.hasVoted;
  const canVote = canAcceptVotingInput(poll) && !voted;

  return (
    <SafeAreaView style={styles.safe}>
      {modal && (
        <FeedbackModal
          visible={modal.visible}
          type={modal.type}
          title={modal.title}
          message={modal.message}
          primaryLabel={modal.primaryLabel}
          onPrimary={modal.onPrimary}
          secondaryLabel={modal.secondaryLabel}
          onSecondary={modal.onSecondary}
        />
      )}
      <ScreenHeader
        title="Poll"
        showBack
        onBack={() => safeGoBack(navigation, "VotingHub")}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <Text style={styles.title}>{poll.title}</Text>
          <Text style={styles.question}>{poll.question}</Text>
          <Text style={styles.meta}>
            {expired ? "Expired" : closed ? "Closed" : voted ? "Vote recorded" : "Open for voting"}
          </Text>
          {poll.expiresAt && (
            <Text style={styles.expiryMeta}>
              {formatVotingExpiryLabel(poll.expiresAt)}
            </Text>
          )}
        </View>
        {poll.options.map((option) => (
          <PollOption
            key={option.id}
            option={option}
            totalVotes={poll.totalVotes}
            selected={selectedOptionId === option.id}
            showResult={voterState.resultsVisible}
            disabled={!canVote || submitting}
            onSelect={() => setSelectedOptionId(option.id)}
          />
        ))}
        {canVote ? (
          <GoldButton
            label="Submit Vote"
            onPress={handleVote}
            loading={submitting}
            fullWidth
          />
        ) : (
          <EmptyState
            icon="✓"
            title={voted ? "Already voted" : "Voting closed"}
            message={
              voted
                ? "Your vote has already been recorded."
                : expired
                  ? "This poll has expired. Results remain available for reference."
                  : "This poll is not accepting votes."
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
  question: {
    fontSize: typography.size.base,
    lineHeight: 22,
    color: colors.text.secondary,
  },
  meta: {
    fontSize: typography.size.sm,
    color: colors.gold.light,
    fontWeight: typography.weight.semibold,
  },
  expiryMeta: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
  },
});

export default PollVoteScreen;
