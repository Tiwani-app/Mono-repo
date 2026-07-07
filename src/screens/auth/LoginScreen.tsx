import React, { useState } from "react";
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
} from "react-native";
import { Controller, useForm } from "react-hook-form";
import { SafeAreaView } from "react-native-safe-area-context";
import GoldButton from "../../components/common/GoldButton";
import Icon from "../../components/common/FeatherIcon";
import { env } from "../../config/env";
import { sendPasswordReset, signIn } from "../../services/authService";
import { colors, spacing, typography } from "../../theme";
import { emailRules, passwordRules } from "../../utils/validators";

interface FormValues {
  email: string;
  password: string;
}

const LoginScreen = ({ navigation }: any) => {
  const [loginError, setLoginError] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { control, getValues, handleSubmit, formState, trigger } =
    useForm<FormValues>({
      defaultValues: {
        email: env.devLoginEmail,
        password: env.devLoginPassword,
      },
    });

  const getAuthErrorMessage = (err: unknown) => {
    const code =
      typeof err === "object" && err && "code" in err
        ? String((err as { code?: string }).code)
        : "";
    const invalidCredentialsMessage = "The email or password is incorrect.";
    const errorMap: Record<string, string> = {
      "auth/invalid-credential": invalidCredentialsMessage,
      "auth/invalid-login-credentials": invalidCredentialsMessage,
      "auth/user-not-found": invalidCredentialsMessage,
      "auth/wrong-password": invalidCredentialsMessage,
      "auth/too-many-requests": "Too many attempts. Try again later.",
      "auth/invalid-email": "Please enter a valid email address.",
      "auth/network-request-failed":
        "Could not connect. Check your internet connection and try again.",
      "auth/account-pending": "This account is pending admin approval.",
      "auth/account-inactive":
        "This account is inactive. Please contact an admin.",
      "auth/account-suspended":
        "This account is suspended. Please contact an admin.",
    };
    if (errorMap[code]) {
      return errorMap[code];
    }
    return "Could not sign in. Please try again.";
  };

  const onSubmit = async ({ email, password }: FormValues) => {
    if (submitting) {
      return;
    }
    try {
      setLoginError(null);
      setSubmitting(true);
      await signIn(email, password);
    } catch (err) {
      setLoginError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    const validEmail = await trigger("email");
    if (!validEmail || resetSubmitting) {
      return;
    }
    try {
      setLoginError(null);
      setResetSubmitting(true);
      await sendPasswordReset(getValues("email"));
      Alert.alert("Check your email", "A password reset link has been sent.");
    } catch (error) {
      Alert.alert("Reset not sent", getAuthErrorMessage(error));
    } finally {
      setResetSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your Tiwani account</Text>
          <Controller
            name="email"
            control={control}
            rules={emailRules}
            render={({ field: { onBlur, onChange, value } }) => (
              <View style={styles.field}>
                <Text style={styles.label}>EMAIL ADDRESS</Text>
                <TextInput
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={colors.text.tertiary}
                  style={[
                    styles.input,
                    formState.errors.email && styles.inputError,
                  ]}
                />
                {formState.errors.email && (
                  <Text style={styles.errorText}>
                    {formState.errors.email.message}
                  </Text>
                )}
              </View>
            )}
          />
          <Controller
            name="password"
            control={control}
            rules={passwordRules}
            render={({ field: { onBlur, onChange, value } }) => (
              <View style={styles.field}>
                <Text style={styles.label}>PASSWORD</Text>
                <View
                  style={[
                    styles.passwordInputWrap,
                    formState.errors.password && styles.inputError,
                  ]}
                >
                  <TextInput
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    secureTextEntry={!passwordVisible}
                    placeholderTextColor={colors.text.tertiary}
                    style={styles.passwordInput}
                  />
                  <TouchableOpacity
                    accessibilityLabel={
                      passwordVisible ? "Hide password" : "Show password"
                    }
                    accessibilityRole="button"
                    onPress={() => setPasswordVisible(current => !current)}
                    style={styles.passwordToggle}
                  >
                    <Icon
                      name={passwordVisible ? "eye-off" : "eye"}
                      size={20}
                      color={colors.text.secondary}
                    />
                  </TouchableOpacity>
                </View>
                {formState.errors.password && (
                  <Text style={styles.errorText}>
                    {formState.errors.password.message}
                  </Text>
                )}
              </View>
            )}
          />
          {loginError && <Text style={styles.errorText}>{loginError}</Text>}
          <TouchableOpacity
            style={styles.forgot}
            onPress={handleForgotPassword}
            disabled={resetSubmitting}
          >
            <Text
              style={[
                styles.forgotText,
                resetSubmitting && styles.disabledText,
              ]}
            >
              {resetSubmitting ? "Sending reset link" : "Forgot password?"}
            </Text>
          </TouchableOpacity>
          <GoldButton
            label="Sign In"
            onPress={handleSubmit(onSubmit)}
            loading={submitting}
            fullWidth
          />
          <TouchableOpacity
            style={styles.joinLink}
            onPress={() => navigation.navigate("RequestJoin")}
          >
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
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.md },
  heading: {
    marginTop: spacing.xxxl,
    fontSize: typography.size.xxxl,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
  },
  field: { gap: spacing.xs },
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
  inputError: { borderColor: colors.status.error },
  passwordInputWrap: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.tertiary,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    borderRadius: 10,
  },
  passwordInput: {
    flex: 1,
    minHeight: 48,
    padding: spacing.md,
    fontSize: typography.size.base,
    color: colors.text.primary,
  },
  passwordToggle: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: { fontSize: typography.size.xs, color: colors.status.error },
  forgot: { alignSelf: "flex-end", minHeight: 48, justifyContent: "center" },
  forgotText: { fontSize: typography.size.base, color: colors.gold.default },
  disabledText: { opacity: 0.5 },
  joinLink: { minHeight: 48, justifyContent: "center" },
  joinText: {
    textAlign: "center",
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  link: { color: colors.gold.default, fontWeight: typography.weight.bold },
});

export default LoginScreen;
