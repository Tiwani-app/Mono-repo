import React, {useEffect, useMemo, useState} from 'react';
import {Alert, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import GoldButton from '../../components/common/GoldButton';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ScreenHeader from '../../components/common/ScreenHeader';
import FinancialGate from '../../components/voting/FinancialGate';
import PollOption from '../../components/voting/PollOption';
import {castPollVote, getPoll, getPollVoterState} from '../../services/votingService';
import {useAuthStore} from '../../store/authStore';
import {useVotingStore} from '../../store/votingStore';
import {colors, spacing, typography} from '../../theme';
import {Poll} from '../../types/voting';
import {safeGoBack} from '../../utils/navigation';

const PollVoteScreen = ({navigation, route}: any) => {
  const pollId = route.params?.pollId as string | undefined;
  const [gated, setGated] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [localPoll, setLocalPoll] = useState<Poll | null>(null);
  const [resultsVisible, setResultsVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const {user} = useAuthStore();
  const {hasVotedPoll, polls, selectedPollOption, setHasVotedPoll, setSelectedPollOption} =
    useVotingStore();
  const storePoll = useMemo(() => polls.find(item => item.id === pollId), [polls, pollId]);
  const poll = storePoll ?? localPoll;

  useEffect(() => {
    let active = true;
    const init = async () => {
      setLoading(true);
      setLoadError(null);
      setGated(false);
      setResultsVisible(false);
      setSelectedPollOption(null);
      if (!user) {
        setLoading(false);
        return;
      }
      if (!pollId) {
        setLoadError('This poll could not be found.');
        setLoading(false);
        return;
      }
      if (user.financialStatus === 'red') {
        setGated(true);
        setLoading(false);
        return;
      }
      try {
        const [nextPoll, voterState] = await Promise.all([
          storePoll ? Promise.resolve(storePoll) : getPoll(pollId),
          getPollVoterState(pollId, user.uid),
        ]);
        if (!active) {
          return;
        }
        setLocalPoll(nextPoll);
        setHasVotedPoll(voterState.hasVoted);
        setResultsVisible(voterState.resultsVisible);
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error ? error.message : 'Could not load this poll.',
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    init();
    return () => {
      active = false;
    };
  }, [pollId, setHasVotedPoll, setSelectedPollOption, storePoll, user]);

  if (gated) {
    return <FinancialGate showBack />;
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (loadError || !poll) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Poll" showBack onBack={() => safeGoBack(navigation, 'VotingHub')} />
        <EmptyState
          icon="!"
          title="Poll unavailable"
          message={loadError ?? 'This poll could not be found.'}
          actionLabel="Back to Voting"
          onAction={() => safeGoBack(navigation, 'VotingHub')}
        />
      </SafeAreaView>
    );
  }

  const handleSubmit = async () => {
    if (!selectedPollOption || !user) {
      return;
    }
    try {
      setSubmitting(true);
      await castPollVote(poll.id, selectedPollOption, user.uid);
      const updatedPoll = await getPoll(poll.id);
      const voterState = await getPollVoterState(poll.id, user.uid);
      setHasVotedPoll(true);
      setResultsVisible(voterState.resultsVisible);
      setLocalPoll(updatedPoll);
    } catch (error) {
      Alert.alert(
        'Vote failed',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Cast Your Vote" showBack onBack={() => safeGoBack(navigation, 'VotingHub')} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.contextCard}>
          <Badge label={`${poll.totalVotes} VOTES`} color={colors.gold.default} />
          <Text style={styles.question}>{poll.question}</Text>
        </View>
        <Text style={styles.sectionLabel}>
          {hasVotedPoll
            ? resultsVisible
              ? 'RESULTS'
              : 'VOTE RECORDED'
            : 'CHOOSE ONE OPTION'}
        </Text>
        {poll.options.map(option => (
          <PollOption
            key={option.id}
            option={option}
            totalVotes={poll.totalVotes}
            selected={selectedPollOption === option.id}
            showResult={resultsVisible}
            disabled={hasVotedPoll}
            onSelect={() => setSelectedPollOption(option.id)}
          />
        ))}
        {hasVotedPoll ? (
          <View style={styles.confirmation}>
            <Text style={styles.confirmationText}>Vote Recorded</Text>
            {!resultsVisible && (
              <Text style={styles.confirmationMeta}>
                Results will be available when this poll closes.
              </Text>
            )}
          </View>
        ) : (
          <GoldButton
            label="Submit Vote"
            onPress={handleSubmit}
            disabled={!selectedPollOption}
            loading={submitting}
            fullWidth
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.bg.secondary},
  content: {padding: spacing.lg, gap: spacing.md},
  contextCard: {gap: spacing.md, padding: spacing.lg, borderRadius: 8, backgroundColor: colors.bg.card},
  question: {fontSize: typography.size.lg, color: colors.text.primary, fontWeight: typography.weight.bold},
  sectionLabel: {fontSize: typography.size.xs, color: colors.text.secondary, fontWeight: typography.weight.bold},
  confirmation: {padding: spacing.lg, borderRadius: 8, backgroundColor: `${colors.status.success}18`},
  confirmationText: {color: colors.status.success, fontWeight: typography.weight.bold, textAlign: 'center'},
  confirmationMeta: {
    marginTop: spacing.sm,
    color: colors.text.secondary,
    fontSize: typography.size.sm,
    textAlign: 'center',
  },
});

export default PollVoteScreen;
