import React from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {useThemeColors, useThemedStyles, AppColors} from '../../theme';

const LoadingSpinner = () => {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
    <ActivityIndicator size="large" color={colors.gold.default} />
  </View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.secondary,
  },
});

export default LoadingSpinner;
