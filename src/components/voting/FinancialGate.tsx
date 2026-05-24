import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import GoldButton from '../common/GoldButton';
import ScreenHeader from '../common/ScreenHeader';
import {colors, spacing, typography} from '../../theme';
import {safeGoBack} from '../../utils/navigation';

interface Props {
  showBack?: boolean;
}

const FinancialGate = ({showBack = false}: Props) => {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.safe}>
      {showBack && (
        <ScreenHeader
          title="Voting"
          showBack
          onBack={() => safeGoBack(navigation, 'VotingHub')}
        />
      )}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.bg.secondary},
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
