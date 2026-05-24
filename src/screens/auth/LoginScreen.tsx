import React, {useState} from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {Controller, useForm} from 'react-hook-form';
import {SafeAreaView} from 'react-native-safe-area-context';
import GoldButton from '../../components/common/GoldButton';
import {sendPasswordReset, signIn} from '../../services/authService';
import {colors, spacing, typography} from '../../theme';
import {emailRules, passwordRules} from '../../utils/validators';

interface FormValues {
  email: string;
  password: string;
}

const LoginScreen = ({navigation}: any) => {
  const [loginError, setLoginError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const {control, handleSubmit, formState} = useForm<FormValues>({
    defaultValues: {email: 'admin@tiwani.app', password: 'password'},
  });

  const onSubmit = async ({email, password}: FormValues) => {
    try {
      setLoginError(null);
      setSubmitting(true);
      await signIn(email, password);
    } catch (err: any) {
      const errorMap: Record<string, string> = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/too-many-requests': 'Too many attempts. Try again later.',
        'auth/invalid-email': 'Please enter a valid email address.',
      };
      setLoginError(errorMap[err.code] ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.prompt('Reset Password', 'Enter your email address and we will send you a reset link.', async email => {
      if (email) {
        await sendPasswordReset(email);
        Alert.alert('Check your email', 'A password reset link has been sent.');
      }
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your Tiwani account</Text>
          <Controller
            name="email"
            control={control}
            rules={emailRules}
            render={({field: {onBlur, onChange, value}}) => (
              <View style={styles.field}>
                <Text style={styles.label}>EMAIL ADDRESS</Text>
                <TextInput
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={colors.text.tertiary}
                  style={[styles.input, formState.errors.email && styles.inputError]}
                />
                {formState.errors.email && (
                  <Text style={styles.errorText}>{formState.errors.email.message}</Text>
                )}
              </View>
            )}
          />
          <Controller
            name="password"
            control={control}
            rules={passwordRules}
            render={({field: {onBlur, onChange, value}}) => (
              <View style={styles.field}>
                <Text style={styles.label}>PASSWORD</Text>
                <TextInput
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  secureTextEntry
                  placeholderTextColor={colors.text.tertiary}
                  style={[styles.input, formState.errors.password && styles.inputError]}
                />
                {formState.errors.password && (
                  <Text style={styles.errorText}>{formState.errors.password.message}</Text>
                )}
              </View>
            )}
          />
          {loginError && <Text style={styles.errorText}>{loginError}</Text>}
          <TouchableOpacity style={styles.forgot} onPress={handleForgotPassword}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>
          <GoldButton
            label="Sign In"
            onPress={handleSubmit(onSubmit)}
            loading={submitting}
            fullWidth
          />
          <TouchableOpacity
            style={styles.joinLink}
            onPress={() => navigation.navigate('RequestJoin')}>
            <Text style={styles.joinText}>
              Not a member? <Text style={styles.link}>Request to Join</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.bg.secondary},
  flex: {flex: 1},
  content: {padding: spacing.xl, gap: spacing.md},
  heading: {
    marginTop: spacing.xxxl,
    fontSize: typography.size.xxxl,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
  },
  subtitle: {fontSize: typography.size.base, color: colors.text.secondary, marginBottom: spacing.xl},
  field: {gap: spacing.xs},
  label: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  input: {
    minHeight: 48,
    padding: spacing.md,
    backgroundColor: colors.bg.tertiary,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    borderRadius: 10,
    fontSize: typography.size.base,
    color: colors.text.primary,
  },
  inputError: {borderColor: colors.status.error},
  errorText: {fontSize: typography.size.xs, color: colors.status.error},
  forgot: {alignSelf: 'flex-end', minHeight: 48, justifyContent: 'center'},
  forgotText: {fontSize: typography.size.base, color: colors.gold.default},
  joinLink: {minHeight: 48, justifyContent: 'center'},
  joinText: {textAlign: 'center', color: colors.text.secondary, marginTop: spacing.md},
  link: {color: colors.gold.default, fontWeight: typography.weight.bold},
});

export default LoginScreen;
