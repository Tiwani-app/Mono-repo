import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useThemeColors, useThemedStyles, AppColors} from '../../theme';

interface Props {
  value: number;
  color?: string;
  height?: number;
}

const ProgressBar = ({value, color, height = 4}: Props) => {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const resolvedColor = color ?? colors.gold.default;
  return (
    <View style={[styles.track, {height}]}>
    <View
      style={[
        styles.fill,
        {
          width: `${Math.min(Math.max(value, 0), 1) * 100}%`,
          backgroundColor: resolvedColor,
          height,
        },
      ]}
    />
  </View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: colors.border.subtle,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {borderRadius: 2},
});

export default ProgressBar;
