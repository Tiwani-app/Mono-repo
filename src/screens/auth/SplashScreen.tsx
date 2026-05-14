import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import GoldButton from '../../components/common/GoldButton';
import {colors, spacing, typography} from '../../theme';

const SplashScreen = ({navigation}: any) => (
  <SafeAreaView style={styles.safe}>
    <View style={styles.container}>
      <View style={styles.logoOuter}>
        <View style={styles.logoInner}>
          <Text style={styles.logoText}>T</Text>
        </View>
      </View>
      <Text style={styles.brand}>TIWANI</Text>
      <Text style={styles.tagline}>Your community, together.</Text>
      <View style={styles.action}>
        <GoldButton label="Get Started" onPress={() => navigation.navigate('Login')} fullWidth />
      </View>
      <Text style={styles.version}>v2.1.0 · Membership Platform</Text>
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.bg.primary},
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  logoOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.gold.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {fontSize: 40, fontWeight: typography.weight.black, color: colors.gold.light},
  brand: {
    marginTop: 24,
    fontSize: 28,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
    letterSpacing: 5,
  },
  tagline: {
    marginTop: spacing.sm,
    fontSize: typography.size.base,
    color: colors.text.secondary,
    letterSpacing: 1,
  },
  action: {width: '100%', marginTop: 52},
  version: {marginTop: spacing.lg, fontSize: typography.size.xs, color: colors.text.tertiary},
});

export default SplashScreen;
