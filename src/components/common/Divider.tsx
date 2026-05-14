import React from 'react';
import {StyleSheet, View} from 'react-native';
import {colors} from '../../theme';

const Divider = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
  },
});

export default Divider;
