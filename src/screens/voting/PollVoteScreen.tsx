import React, {useEffect, useMemo, useState} from 'react';
import {Alert, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Badge from '../../components/common/Badge';
import GoldButton from '../../components/common/GoldButton';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ScreenHeader from '../../components/common/ScreenHeader';
import FinancialGate from '../../components/voting/FinancialGate';
import PollOption from '../../components/voting/PollOption';
import {castPollVote, hasCastPollVote} from '../../services/votingService';
import {useAuthStore} from '../../store/authStore';
import {useVotingStore} from '../../store/votingStore';
import {colors, spacing, typography} from '../../theme';
import {safeGoBack} from '../../utils/navigation';

const PollVoteScreen = ({navigation, route}: any) => {
  const [gated, setGated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const {user} = useAuthStore();
  const {hasVotedPoll, polls, selectedPollOption, setHasVotedPoll, setSelectedPollOption} =
    useVotingStore();
  const poll = useMemo(() => polls.find(item => item.id === route.params.pollId), [polls, route.params.pollId]);

  useEffect(() => {
    const init = async () => {
      if (!user) {
        return;
      }
      if (user.financialStatus === 'red') {
        setGated(true);
        return;
      }
      setHasVotedPoll(await hasCastPollVote(route.params.pollId, user.uid));
    };
    init();
  }, [route.params.pollId, setHasVotedPoll, user]);

  if (gated) {
    return <FinancialGate />;
  }

  if (!poll) {
    return <LoadingSpinner />;
  }

  const handleSubmit = async () => {
    if (!selectedPollOption || !user) {
      return;
    }
    try {
      setSubmitting(true);
      await castPollVote(poll.id, selectedPollOption, user.uid);
      setHasVotedPoll(true);
    } catch (error: any) {
      Alert.alert('Vote failed', error.message ?? 'Please try again.');
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
        <Text style={styles.sectionLabel}>{hasVotedPoll ? 'RESULTS' : 'CHOOSE ONE OPTION'}</Text>
        {poll.options.map(option => (
          <PollOption
            key={option.id}
            option={option}
            totalVotes={poll.totalVotes}
            selected={selectedPollOption === option.id}
            showResult={hasVotedPoll}
            disabled={hasVotedPoll}
            onSelect={() => setSelectedPollOption(option.id)}
          />
        ))}
        {hasVotedPoll ? (
          <View style={styles.confirmation}>
            <Text style={styles.confirmationText}>Vote Recorded</Text>
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
});

export default PollVoteScreen;
