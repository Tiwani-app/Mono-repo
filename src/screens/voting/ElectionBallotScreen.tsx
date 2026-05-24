import React, {useEffect, useMemo, useState} from 'react';
import {Alert, ScrollView, StyleSheet, Text, View} from 'react-native';
import Icon from '../../components/common/FeatherIcon';
import {SafeAreaView} from 'react-native-safe-area-context';
import EmptyState from '../../components/common/EmptyState';
import GoldButton from '../../components/common/GoldButton';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ScreenHeader from '../../components/common/ScreenHeader';
import CandidateCard from '../../components/voting/CandidateCard';
import FinancialGate from '../../components/voting/FinancialGate';
import {castElectionBallot, getElection, hasCastElectionVote} from '../../services/votingService';
import {useAuthStore} from '../../store/authStore';
import {useVotingStore} from '../../store/votingStore';
import {colors, spacing, typography} from '../../theme';
import {Election} from '../../types/voting';
import {safeGoBack} from '../../utils/navigation';
import {isElectionBallotComplete} from '../../utils/votingGuards';

const ElectionBallotScreen = ({navigation, route}: any) => {
  const [gated, setGated] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [localElection, setLocalElection] = useState<Election | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [voteSubmitted, setVoteSubmitted] = useState(false);
  const {user} = useAuthStore();
  const {
    electionChoices,
    elections,
    hasVotedElection,
    resetElectionChoices,
    setElectionChoice,
    setHasVotedElection,
  } = useVotingStore();
  const storeElection = useMemo(
    () => elections.find(item => item.id === route.params.electionId),
    [elections, route.params.electionId],
  );
  const election = storeElection ?? localElection;

  useEffect(() => {
    let active = true;
    const init = async () => {
      setLoading(true);
      setLoadError(null);
      setGated(false);
      if (!user) {
        setLoading(false);
        return;
      }
      if (user.financialStatus === 'red') {
        setGated(true);
        setLoading(false);
        return;
      }
      try {
        const [nextElection, voted] = await Promise.all([
          storeElection ? Promise.resolve(storeElection) : getElection(route.params.electionId),
          hasCastElectionVote(route.params.electionId, user.uid),
        ]);
        if (!active) {
          return;
        }
        setLocalElection(nextElection);
        setHasVotedElection(voted);
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Could not load this election.',
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
  }, [route.params.electionId, setHasVotedElection, storeElection, user]);

  if (gated) {
    return <FinancialGate />;
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (loadError || !election) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Election" showBack onBack={() => safeGoBack(navigation, 'VotingHub')} />
        <EmptyState
          icon="!"
          title="Election unavailable"
          message={loadError ?? 'This election could not be found.'}
          actionLabel="Back to Voting"
          onAction={() => safeGoBack(navigation, 'VotingHub')}
        />
      </SafeAreaView>
    );
  }

  if (election.status !== 'open' && !hasVotedElection && !voteSubmitted) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Election" showBack onBack={() => safeGoBack(navigation, 'VotingHub')} />
        <EmptyState
          icon="!"
          title="Election closed"
          message="This election is not open for ballots right now."
          actionLabel="Back to Voting"
          onAction={() => safeGoBack(navigation, 'VotingHub')}
        />
      </SafeAreaView>
    );
  }

  const allRacesFilled = isElectionBallotComplete(election, electionChoices);

  const handleSubmitBallot = async () => {
    if (!user) {
      return;
    }
    try {
      setSubmitting(true);
      await castElectionBallot(election.id, electionChoices, user.uid);
      setHasVotedElection(true);
      setVoteSubmitted(true);
      resetElectionChoices();
    } catch (error) {
      Alert.alert(
        'Ballot failed',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (voteSubmitted || hasVotedElection) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Ballot Submitted" showBack onBack={() => safeGoBack(navigation, 'VotingHub')} />
        <View style={styles.successContainer}>
          <View style={styles.checkCircle}>
            <Icon name="check" size={28} color={colors.status.success} />
          </View>
          <Text style={styles.successTitle}>Ballot Submitted</Text>
          <Text style={styles.successBody}>
            Your {election.ballotType === 'secret' ? 'secret ' : ''}ballot has been recorded.
          </Text>
          <GoldButton label="Back to Voting" onPress={() => safeGoBack(navigation, 'VotingHub')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title={election.title} showBack onBack={() => safeGoBack(navigation, 'VotingHub')} />
      <ScrollView contentContainerStyle={styles.content}>
        {election.ballotType === 'secret' && (
          <View style={styles.disclaimer}>
            <Icon name="lock" size={16} color={colors.gold.default} />
            <Text style={styles.disclaimerText}>Secret ballot results are announced after voting closes.</Text>
          </View>
        )}
        {election.races.map(race => (
          <View key={race.raceId} style={styles.race}>
            <Text style={styles.office}>Vote for {race.office}</Text>
            <Text style={styles.subtitle}>Select one candidate</Text>
            {race.candidates.map(candidate => (
              <CandidateCard
                key={candidate.name}
                candidate={candidate}
                selected={electionChoices[race.raceId] === candidate.name}
                onPress={() => setElectionChoice(race.raceId, candidate.name)}
              />
            ))}
          </View>
        ))}
        <GoldButton
          label="Submit Ballot"
          onPress={handleSubmitBallot}
          disabled={!allRacesFilled}
          loading={submitting}
          fullWidth
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.bg.secondary},
  content: {padding: spacing.lg, gap: spacing.lg},
  disclaimer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    backgroundColor: `${colors.gold.default}12`,
  },
  disclaimerText: {flex: 1, color: colors.text.secondary},
  race: {gap: spacing.md},
  office: {fontSize: typography.size.lg, color: colors.text.primary, fontWeight: typography.weight.bold},
  subtitle: {fontSize: typography.size.sm, color: colors.text.secondary},
  successContainer: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl},
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.status.success}18`,
  },
  successTitle: {fontSize: typography.size.xl, color: colors.text.primary, fontWeight: typography.weight.black},
  successBody: {fontSize: typography.size.base, color: colors.text.secondary, textAlign: 'center'},
});

export default ElectionBallotScreen;
