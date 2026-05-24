import React from 'react';
import {Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import GoldButton from '../../components/common/GoldButton';
import OutlineButton from '../../components/common/OutlineButton';
import ScreenHeader from '../../components/common/ScreenHeader';
import FinancialGate from '../../components/voting/FinancialGate';
import PollCard from '../../components/voting/PollCard';
import {useVoting} from '../../hooks/useVoting';
import {closePoll} from '../../services/votingService';
import {useAuthStore} from '../../store/authStore';
import {colors, spacing, typography} from '../../theme';
import {isAdmin} from '../../utils/roleGuard';

const VotingHubScreen = ({navigation}: any) => {
  const {elections, polls} = useVoting();
  const {user} = useAuthStore();
  const empty = elections.length === 0 && polls.length === 0;
  const admin = isAdmin(user);

  const confirmClosePoll = (pollId: string) => {
    Alert.alert('Close Poll', 'Close this poll and remove it from active voting?', [
      {text: 'Keep Open', style: 'cancel'},
      {
        text: 'Close Poll',
        style: 'destructive',
        onPress: () => closePoll(pollId),
      },
    ]);
  };

  if (user?.financialStatus === 'red') {
    return <FinancialGate />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Vote & Polls" />
      <ScrollView contentContainerStyle={styles.content}>
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
              <TouchableOpacity
                key={election.id}
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
