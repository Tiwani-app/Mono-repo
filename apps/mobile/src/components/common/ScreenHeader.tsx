import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from './FeatherIcon';
import {colors, spacing, typography} from '../../theme';

interface Props {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
}

const ScreenHeader = ({title, showBack, onBack, rightElement}: Props) => (
  <View style={styles.container}>
    {showBack ? (
      <TouchableOpacity
        onPress={onBack}
        style={styles.backBtn}
        hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
        <Icon name="arrow-left" size={20} color={colors.gold.default} />
      </TouchableOpacity>
    ) : (
      <View style={styles.backPlaceholder} />
    )}
    <Text style={styles.title} numberOfLines={1}>
      {title}
    </Text>
    <View style={styles.right}>{rightElement ?? null}</View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  backBtn: {padding: 2},
  backPlaceholder: {width: 24},
  title: {
    flex: 1,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  right: {minWidth: 24, alignItems: 'flex-end'},
});

export default ScreenHeader;
