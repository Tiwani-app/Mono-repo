import React from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {colors} from '../../theme';

const LoadingSpinner = () => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color={colors.gold.default} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.secondary,
  },
});

export default LoadingSpinner;
