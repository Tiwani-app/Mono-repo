import React from 'react';
import {Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import GoldButton from '../../components/common/GoldButton';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import OutlineButton from '../../components/common/OutlineButton';
import ScreenHeader from '../../components/common/ScreenHeader';
import SyncStatusBanner from '../../components/common/SyncStatusBanner';
import FinancialGate from '../../components/voting/FinancialGate';
import PollCard from '../../components/voting/PollCard';
import {useVoting} from '../../hooks/useVoting';
import {closeElection, closePoll} from '../../services/votingService';
import {useAuthStore} from '../../store/authStore';
import {colors, spacing, typography} from '../../theme';
import {canViewElectionResults, isAdmin} from '../../utils/roleGuard';

const VotingHubScreen = ({navigation}: any) => {
  const {elections, error, lastSyncedAt, loading, polls, syncState} = useVoting();
  const {user} = useAuthStore();
  const empty = elections.length === 0 && polls.length === 0;
  const admin = isAdmin(user);
  const canSeeResults = canViewElectionResults(user);

  const confirmClosePoll = (pollId: string) => {
    Alert.alert('Close Poll', 'Close this poll and remove it from active voting?', [
      {text: 'Keep Open', style: 'cancel'},
      {
        text: 'Close Poll',
        style: 'destructive',
        onPress: async () => {
          try {
            await closePoll(pollId);
          } catch (closeError) {
            Alert.alert(
              'Poll not closed',
              closeError instanceof Error ? closeError.message : 'Please try again.',
            );
          }
        },
      },
    ]);
  };

  const confirmCloseElection = (electionId: string) => {
    Alert.alert('Close Election', 'Close this election and show results?', [
      {text: 'Keep Open', style: 'cancel'},
      {
        text: 'Close Election',
        style: 'destructive',
        onPress: async () => {
          try {
            await closeElection(electionId);
          } catch (closeError) {
            Alert.alert(
              'Election not closed',
              closeError instanceof Error ? closeError.message : 'Please try again.',
            );
          }
        },
      },
    ]);
  };

  if (user?.financialStatus === 'red') {
    return <FinancialGate />;
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Vote & Polls" />
        <EmptyState icon="!" title="Voting unavailable" message={error} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Vote & Polls" />
      <ScrollView contentContainerStyle={styles.content}>
        <SyncStatusBanner state={syncState} lastSyncedAt={lastSyncedAt} />
        {admin && (
          <View style={styles.adminActions}>
            <GoldButton label="New Poll" onPress={() => navigation.navigate('PollForm')} />
            <GoldButton label="New Election" onPress={() => navigation.navigate('ElectionForm')} />
          </View>
        )}
        {empty ? (
          <EmptyState icon="🗳️" title="No active votes" message="The admin will open polls and elections here." />
        ) : (
          <>
            {elections.length > 0 && <Text style={styles.sectionLabel}>ACTIVE ELECTION</Text>}
            {elections.map(election => (
              <View key={election.id} style={styles.electionBlock}>
                <TouchableOpacity
                  style={styles.electionCard}
                  onPress={() => navigation.navigate('ElectionBallot', {electionId: election.id})}
                  activeOpacity={0.8}>
                  <Text style={styles.title}>{election.title}</Text>
                  <Badge
                    label={election.ballotType === 'secret' ? 'SECRET BALLOT' : 'OPEN BALLOT'}
                    color={colors.gold.default}
                  />
                  <Text style={styles.meta}>{election.races.length} races</Text>
                  <GoldButton
                    label="Cast Your Vote"
                    onPress={() => navigation.navigate('ElectionBallot', {electionId: election.id})}
                    size="sm"
                  />
                </TouchableOpacity>
                {(admin || canSeeResults) && (
                  <View style={styles.pollActions}>
                    {admin && (
                      <OutlineButton
                        label="Edit"
                        onPress={() => navigation.navigate('ElectionForm', {electionId: election.id})}
                      />
                    )}
                    <OutlineButton
                      label="Results"
                      onPress={() => navigation.navigate('ElectionResults', {electionId: election.id})}
                    />
                    {admin && (
                      <OutlineButton
                        label="Close"
                        color={colors.status.error}
                        onPress={() => confirmCloseElection(election.id)}
                      />
                    )}
                  </View>
                )}
              </View>
            ))}
            {polls.length > 0 && <Text style={styles.sectionLabel}>ACTIVE POLLS</Text>}
            {polls.map(poll => (
              <View key={poll.id} style={styles.pollBlock}>
                <PollCard
                  poll={poll}
                  onPress={() => navigation.navigate('PollVote', {pollId: poll.id})}
                />
                {admin && (
                  <View style={styles.pollActions}>
                    <OutlineButton
                      label="Edit"
                      onPress={() => navigation.navigate('PollForm', {pollId: poll.id})}
                    />
                    <OutlineButton
                      label="Close"
                      color={colors.status.error}
                      onPress={() => confirmClosePoll(poll.id)}
                    />
                  </View>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.bg.secondary},
  content: {padding: spacing.lg, gap: spacing.md},
  adminActions: {gap: spacing.sm},
  electionBlock: {gap: spacing.sm},
  pollBlock: {gap: spacing.sm},
  pollActions: {gap: spacing.sm},
  sectionLabel: {fontSize: typography.size.xs, color: colors.text.secondary, fontWeight: typography.weight.bold},
  electionCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gold.dark,
    backgroundColor: colors.bg.card,
  },
  title: {fontSize: typography.size.lg, fontWeight: typography.weight.black, color: colors.text.primary},
  meta: {fontSize: typography.size.sm, color: colors.text.secondary},
});

export default VotingHubScreen;
