import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {spacing, typography} from '../../theme';

interface Props {
  label: string;
  color: string;
}

const Badge = ({label, color}: Props) => (
  <View style={[styles.container, {backgroundColor: `${color}22`, borderColor: `${color}44`}]}>
    <Text style={[styles.label, {color}]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.4,
  },
});

export default Badge;
