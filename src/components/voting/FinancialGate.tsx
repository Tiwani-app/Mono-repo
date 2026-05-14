import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import GoldButton from '../common/GoldButton';
import {colors, spacing, typography} from '../../theme';

const FinancialGate = () => {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>!</Text>
      <Text style={styles.title}>Dues Outstanding</Text>
      <Text style={styles.body}>
        You are not in good financial standing. Please settle your outstanding dues before voting.
      </Text>
      <GoldButton
        label="View My Ledger"
        onPress={() => navigation.navigate('Finance', {screen: 'MyLedger'})}
        fullWidth
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.bg.secondary,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    textAlign: 'center',
    textAlignVertical: 'center',
    borderWidth: 1.5,
    borderColor: colors.status.error,
    color: colors.status.error,
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.black,
  },
  title: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.status.error,
    textAlign: 'center',
  },
  body: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default FinancialGate;
