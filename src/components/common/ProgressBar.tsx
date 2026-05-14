import React from 'react';
import {StyleSheet, View} from 'react-native';
import {colors} from '../../theme';

interface Props {
  value: number;
  color?: string;
  height?: number;
}

const ProgressBar = ({value, color = colors.gold.default, height = 4}: Props) => (
  <View style={[styles.track, {height}]}>
    <View
      style={[
        styles.fill,
        {
          width: `${Math.min(Math.max(value, 0), 1) * 100}%`,
          backgroundColor: color,
          height,
        },
      ]}
    />
  </View>
);

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: colors.border.subtle,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {borderRadius: 2},
});

export default ProgressBar;
