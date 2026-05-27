import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, spacing, typography} from '../../theme';
import {DataSyncState} from '../../types/sync';
import {formatRelativeTime} from '../../utils/formatDate';

interface Props {
  state: DataSyncState;
  lastSyncedAt: Date | null;
}

const messageForState = (state: DataSyncState, lastSyncedAt: Date | null) => {
  const suffix = lastSyncedAt ? ` Last updated ${formatRelativeTime(lastSyncedAt)}.` : '';
  switch (state) {
    case 'syncing':
      return 'Syncing latest updates...';
    case 'stale':
      return `Showing saved data while updates reconnect.${suffix}`;
    case 'offline':
      return `You appear to be offline. Showing saved data.${suffix}`;
    default:
      return null;
  }
};

const colorForState = (state: DataSyncState) => {
  if (state === 'offline') {
    return colors.status.error;
  }
  if (state === 'stale') {
    return colors.gold.default;
  }
  return colors.status.info;
};

const SyncStatusBanner = ({lastSyncedAt, state}: Props) => {
  const message = messageForState(state, lastSyncedAt);
  if (!message) {
    return null;
  }
  const color = colorForState(state);
  return (
    <View style={[styles.container, {borderColor: `${color}55`, backgroundColor: `${color}18`}]}>
      <Text style={[styles.text, {color}]}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  text: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
});

export default SyncStatusBanner;

