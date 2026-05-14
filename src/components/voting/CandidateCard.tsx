import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Avatar from '../common/Avatar';
import {colors, spacing, typography} from '../../theme';
import {Candidate} from '../../types/voting';
import {getInitials} from '../../utils/getInitials';

interface Props {
  candidate: Candidate;
  selected: boolean;
  onPress: () => void;
}

const CandidateCard = ({candidate, selected, onPress}: Props) => (
  <TouchableOpacity style={[styles.card, selected && styles.selected]} onPress={onPress} activeOpacity={0.8}>
    <Avatar initials={getInitials(candidate.name)} photoURL={candidate.photoURL} size={44} />
    <View style={styles.content}>
      <Text style={styles.name}>{candidate.name}</Text>
      <Text style={styles.line}>{candidate.manifestoLine}</Text>
    </View>
    <View style={[styles.radio, selected && styles.radioSelected]} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  selected: {borderColor: colors.gold.default, backgroundColor: `${colors.gold.default}12`},
  content: {flex: 1, gap: spacing.xs},
  name: {fontSize: typography.size.md, fontWeight: typography.weight.bold, color: colors.text.primary},
  line: {fontSize: typography.size.sm, color: colors.text.secondary, lineHeight: 18},
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.text.tertiary,
  },
  radioSelected: {borderColor: colors.gold.default, backgroundColor: colors.gold.default},
});

export default CandidateCard;
