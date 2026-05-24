import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { SafeAreaView } from 'react-native-safe-area-context';
import GoldButton from '../../components/common/GoldButton';
import ScreenHeader from '../../components/common/ScreenHeader';
import { createJoinRequest } from '../../services/membersService';
import { colors, spacing, typography } from '../../theme';
import { emailRules } from '../../utils/validators';

interface FormValues {
  fullName: string;
  email: string;
  phone: string;
  message: string;
}

const RequestJoinScreen = ({ navigation }: any) => {
  const [submitting, setSubmitting] = useState(false);
  const { control, handleSubmit, formState } = useForm<FormValues>({
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      message: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setSubmitting(true);
      await createJoinRequest({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        message: values.message.trim(),
      });
      Alert.alert('Request sent', 'An admin will review your request.', [
        {text: 'OK', onPress: navigation.goBack},
      ]);
    } catch (error) {
      Alert.alert(
        'Request not sent',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Request to Join" showBack onBack={navigation.goBack} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Join Tiwani</Text>
          <Text style={styles.body}>
            Send your details to the association admin for review.
          </Text>
          <Field
            control={control}
            error={formState.errors.fullName?.message}
            label="FULL NAME"
            name="fullName"
            rules={{required: 'Full name is required.'}}
          />
          <Field
            control={control}
            error={formState.errors.email?.message}
            keyboardType="email-address"
            label="EMAIL"
            name="email"
            rules={emailRules}
          />
          <Field
            control={control}
            error={formState.errors.phone?.message}
            keyboardType="phone-pad"
            label="PHONE"
            name="phone"
            rules={{required: 'Phone number is required.'}}
          />
          <Field
            control={control}
            error={formState.errors.message?.message}
            label="MESSAGE"
            multiline
            name="message"
            rules={{required: 'Message is required.'}}
          />
          <GoldButton
            label="Submit Request"
            onPress={handleSubmit(onSubmit)}
            loading={submitting}
            fullWidth
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const Field = ({
  control,
  error,
  keyboardType,
  label,
  multiline,
  name,
  rules,
}: any) => (
  <>
    <Text style={styles.label}>{label}</Text>
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({field: {onBlur, onChange, value}}) => (
        <TextInput
          value={value}
          onBlur={onBlur}
          onChangeText={onChange}
          keyboardType={keyboardType}
          multiline={multiline}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : undefined}
          placeholderTextColor={colors.text.tertiary}
          style={[
            styles.input,
            multiline && styles.textArea,
            error && styles.inputError,
          ]}
        />
      )}
    />
    {error && <Text style={styles.errorText}>{error}</Text>}
  </>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  title: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
  },
  body: { fontSize: typography.size.base, color: colors.text.secondary },
  label: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  input: {
    minHeight: 48,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.tertiary,
    color: colors.text.primary,
  },
  textArea: { minHeight: 92, textAlignVertical: 'top' },
  inputError: { borderColor: colors.status.error },
  errorText: { fontSize: typography.size.xs, color: colors.status.error },
});

export default RequestJoinScreen;
