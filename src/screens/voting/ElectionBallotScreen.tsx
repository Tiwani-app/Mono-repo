import React, {useEffect, useMemo, useState} from 'react';
import {Alert, ScrollView, StyleSheet, Text, View} from 'react-native';
import Icon from '../../components/common/FeatherIcon';
import {SafeAreaView} from 'react-native-safe-area-context';
import GoldButton from '../../components/common/GoldButton';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ScreenHeader from '../../components/common/ScreenHeader';
import CandidateCard from '../../components/voting/CandidateCard';
import FinancialGate from '../../components/voting/FinancialGate';
import {castElectionBallot, hasCastElectionVote} from '../../services/votingService';
import {useAuthStore} from '../../store/authStore';
import {useVotingStore} from '../../store/votingStore';
import {colors, spacing, typography} from '../../theme';
import {safeGoBack} from '../../utils/navigation';

const ElectionBallotScreen = ({navigation, route}: any) => {
  const [gated, setGated] = useState(false);
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
  const election = useMemo(
    () => elections.find(item => item.id === route.params.electionId),
    [elections, route.params.electionId],
  );

  useEffect(() => {
    const init = async () => {
      if (!user) {
        return;
      }
      if (user.financialStatus === 'red') {
        setGated(true);
        return;
      }
      setHasVotedElection(await hasCastElectionVote(route.params.electionId, user.uid));
    };
    init();
  }, [route.params.electionId, setHasVotedElection, user]);

  if (gated) {
    return <FinancialGate />;
  }

  if (!election) {
    return <LoadingSpinner />;
  }

  const allRacesFilled = election.races.every(race => electionChoices[race.raceId] !== undefined);

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
    } catch (error: any) {
      Alert.alert('Ballot failed', error.message ?? 'Please try again.');
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
