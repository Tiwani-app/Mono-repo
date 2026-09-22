import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import {spacing} from '../../theme';

interface Props {
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

const KeyboardAwareScroll = ({children, contentStyle}: Props) => (
  <KeyboardAvoidingView
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    style={styles.flex}>
    <ScrollView
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  </KeyboardAvoidingView>
);

const styles = StyleSheet.create({
  flex: {flex: 1},
  content: {padding: spacing.lg, gap: spacing.md},
});

export default KeyboardAwareScroll;
