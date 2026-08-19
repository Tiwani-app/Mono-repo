import React from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {useThemeColors, useThemedStyles, AppColors} from '../../theme';
import {FinancialStatus} from '../../types/user';

interface Props {
  status: FinancialStatus;
  style?: StyleProp<ViewStyle>;
}

const StatusDot = ({status, style}: Props) => {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  return (
    <View
    style={[
      styles.dot,
      {backgroundColor: status === 'green' ? colors.status.success : colors.status.error},
      style,
    ]}
  />
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.bg.secondary,
  },
});

export default StatusDot;
