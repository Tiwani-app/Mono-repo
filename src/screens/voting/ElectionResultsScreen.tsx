import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ProgressBar from '../../components/common/ProgressBar';
import ScreenHeader from '../../components/common/ScreenHeader';
import {
  RaceResult,
  getElection,
  getElectionResults,
} from '../../services/votingService';
import { colors, spacing, typography } from '../../theme';
import { Election } from '../../types/voting';
import { safeGoBack } from '../../utils/navigation';

const ElectionResultsScreen = ({ navigation, route }: any) => {
  const electionId = route.params?.electionId as string | undefined;
  const [election, setElection] = useState<Election | null>(null);
  const [results, setResults] = useState<RaceResult[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    if (!electionId) {
      setLoadError('This election could not be found.');
      setLoading(false);
      return;
    }
    Promise.all([
      getElection(electionId),
      getElectionResults(electionId),
    ])
      .then(([nextElection, nextResults]) => {
        setElection(nextElection);
        setResults(nextResults);
      })
      .catch(error =>
        setLoadError(
          error instanceof Error
            ? error.message
            : 'Could not load election results.',
        ),
      )
      .finally(() => setLoading(false));
  }, [electionId]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (loadError || !election) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Election Results"
          showBack
          onBack={() => safeGoBack(navigation, 'VotingHub')}
        />
        <EmptyState
          icon="!"
          title="Results unavailable"
          message={loadError ?? 'This election could not be found.'}
          actionLabel="Back to Voting"
          onAction={() => safeGoBack(navigation, 'VotingHub')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Election Results"
        showBack
        onBack={() => safeGoBack(navigation, 'VotingHub')}
      />
      <FlatList
        data={results}
        keyExtractor={item => item.raceId}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.hero}>
            <Badge label={election.status.toUpperCase()} color={colors.gold.default} />
            <Text style={styles.title}>{election.title}</Text>
            <Text style={styles.meta}>
              {election.ballotType === 'secret' ? 'Secret ballot' : 'Open ballot'}
            </Text>
          </View>
        }
        renderItem={({item}) => {
          const totalVotes = item.candidates.reduce((sum, candidate) => sum + candidate.voteCount, 0);
          return (
            <View style={styles.raceCard}>
              <Text style={styles.office}>{item.office}</Text>
              {item.candidates.map(candidate => {
                const ratio = totalVotes > 0 ? candidate.voteCount / totalVotes : 0;
                return (
                  <View key={candidate.name} style={styles.resultRow}>
                    <View style={styles.resultTextRow}>
                      <Text style={styles.candidateName}>{candidate.name}</Text>
                      <Text style={styles.voteCount}>{candidate.voteCount} votes</Text>
                    </View>
                    <ProgressBar value={ratio} />
                  </View>
                );
              })}
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="!"
            title="No results yet"
            message="Results will appear after ballots are submitted."
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.bg.secondary},
  content: {padding: spacing.lg, gap: spacing.md},
  hero: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  title: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
  },
  meta: {fontSize: typography.size.sm, color: colors.text.secondary},
  raceCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  office: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  resultRow: {gap: spacing.sm},
  resultTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  candidateName: {flex: 1, fontSize: typography.size.base, color: colors.text.primary},
  voteCount: {fontSize: typography.size.sm, color: colors.text.secondary},
});

export default ElectionResultsScreen;
