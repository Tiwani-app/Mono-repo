import React, { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { SafeAreaView } from 'react-native-safe-area-context';
import FeedbackModal, { FeedbackModalType } from '../../components/common/FeedbackModal';
import GoldButton from '../../components/common/GoldButton';
import ScreenHeader from '../../components/common/ScreenHeader';
import Icon from '../../components/common/FeatherIcon';
import {
  COUNTRY_CALLING_CODES,
  CountryCallingCode,
} from '../../constants/countryCallingCodes';
import { createJoinRequest } from '../../services/membersService';
import { colors, spacing, typography } from '../../theme';
import { emailRules } from '../../utils/validators';
import { safeGoBack } from '../../utils/navigation';

interface FormValues {
  fullName: string;
  email: string;
  countryCode: string;
  phoneNumber: string;
  message: string;
}

const RequestJoinScreen = ({ navigation }: any) => {
  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState<{
    visible: boolean;
    type: FeedbackModalType;
    title: string;
    message: string;
    primaryLabel?: string;
    onPrimary: () => void;
    secondaryLabel?: string;
    onSecondary?: () => void;
  } | null>(null);
  const closeModal = () => setModal(null);
  const { control, handleSubmit, formState } = useForm<FormValues>({
    defaultValues: {
      fullName: '',
      email: '',
      countryCode: '+234',
      phoneNumber: '',
      message: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (submitting) {
      return;
    }
    try {
      setSubmitting(true);
      await createJoinRequest({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        phone: `${values.countryCode.trim()} ${values.phoneNumber.trim()}`.trim(),
        message: values.message.trim(),
      });
      setModal({ visible: true, type: "success", title: "Request sent", message: "An admin will review your request.", primaryLabel: "OK", onPrimary: () => { closeModal(); safeGoBack(navigation, 'Login'); } });
    } catch (error) {
      setModal({ visible: true, type: "error", title: "Request not sent", message: error instanceof Error ? error.message : "Please try again.", onPrimary: closeModal });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {modal && (
        <FeedbackModal
          visible={modal.visible}
          type={modal.type}
          title={modal.title}
          message={modal.message}
          primaryLabel={modal.primaryLabel}
          onPrimary={modal.onPrimary}
          secondaryLabel={modal.secondaryLabel}
          onSecondary={modal.onSecondary}
        />
      )}
      <ScreenHeader title="Request to Join" showBack onBack={() => safeGoBack(navigation, 'Login')} />
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
          <View style={styles.phoneRow}>
            <View style={styles.countryCodeField}>
              <CountryCodeField
                control={control}
                error={formState.errors.countryCode?.message}
                name="countryCode"
                rules={{
                  required: 'Country code is required.',
                }}
              />
            </View>
            <View style={styles.phoneNumberField}>
              <Field
                control={control}
                error={formState.errors.phoneNumber?.message}
                keyboardType="phone-pad"
                label="PHONE NUMBER"
                name="phoneNumber"
                rules={{
                  required: 'Phone number is required.',
                  pattern: {
                    value: /^[0-9 ()-]{6,20}$/,
                    message: 'Enter a valid phone number.',
                  },
                }}
              />
            </View>
          </View>
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

const CountryCodeField = ({
  control,
  error,
  name,
  rules,
}: {
  control: any;
  error?: string;
  name: string;
  rules: any;
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filteredCountries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return COUNTRY_CALLING_CODES;
    }
    return COUNTRY_CALLING_CODES.filter((country) =>
      `${country.name} ${country.iso2} ${country.dialCode}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query]);

  return (
    <>
      <Text style={styles.label}>COUNTRY</Text>
      <Controller
        control={control}
        name={name}
        rules={rules}
        render={({ field: { onChange, value } }) => {
          const selectedCountry = COUNTRY_CALLING_CODES.find(
            (country) => country.dialCode === value,
          );
          const selectCountry = (country: CountryCallingCode) => {
            onChange(country.dialCode);
            setQuery('');
            setOpen(false);
          };

          return (
            <>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setOpen(true)}
                style={[styles.input, styles.countrySelect, error && styles.inputError]}
              >
                <Text style={styles.countryCodeText}>
                  {selectedCountry?.dialCode ?? value}
                </Text>
                <Icon
                  name="chevron-down"
                  size={16}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>
              <Modal
                visible={open}
                transparent
                animationType="fade"
                onRequestClose={() => setOpen(false)}
              >
                <View style={styles.modalBackdrop}>
                  <View style={styles.countryModal}>
                    <View style={styles.modalHeader}>
                      <View>
                        <Text style={styles.modalTitle}>Choose Country</Text>
                        <Text style={styles.modalSubtitle}>
                          Search by country name or calling code.
                        </Text>
                      </View>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setOpen(false)}
                        style={styles.modalCloseButton}
                      >
                        <Icon
                          name="x"
                          size={18}
                          color={colors.text.primary}
                        />
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      value={query}
                      onChangeText={setQuery}
                      autoCapitalize="words"
                      autoCorrect={false}
                      placeholder="Search country or code"
                      placeholderTextColor={colors.text.tertiary}
                      style={styles.countrySearchInput}
                    />
                    <FlatList
                      data={filteredCountries}
                      keyExtractor={(country) =>
                        `${country.iso2}-${country.dialCode}`
                      }
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={false}
                      renderItem={({ item }) => {
                        const selected = item.dialCode === value;
                        return (
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => selectCountry(item)}
                            style={[
                              styles.countryOption,
                              selected && styles.selectedCountryOption,
                            ]}
                          >
                            <View style={styles.countryOptionTextWrap}>
                              <Text style={styles.countryName}>
                                {item.name}
                              </Text>
                              <Text style={styles.countryIso}>{item.iso2}</Text>
                            </View>
                            <Text style={styles.countryDialCode}>
                              {item.dialCode}
                            </Text>
                          </TouchableOpacity>
                        );
                      }}
                      ListEmptyComponent={
                        <Text style={styles.emptyCountryText}>
                          No country matched your search.
                        </Text>
                      }
                    />
                  </View>
                </View>
              </Modal>
            </>
          );
        }}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </>
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
  phoneRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  countryCodeField: { width: 104 },
  phoneNumberField: { flex: 1 },
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
  countrySelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countryCodeText: {
    color: colors.text.primary,
    fontSize: typography.size.base,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  countryModal: {
    maxHeight: '78%',
    padding: spacing.lg,
    gap: spacing.md,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.secondary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  modalTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  modalSubtitle: {
    marginTop: spacing.xs,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.bg.tertiary,
  },
  countrySearchInput: {
    minHeight: 48,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.tertiary,
    color: colors.text.primary,
  },
  countryOption: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
  },
  selectedCountryOption: {
    backgroundColor: `${colors.gold.default}18`,
  },
  countryOptionTextWrap: { flex: 1 },
  countryName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  countryIso: {
    marginTop: 2,
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    letterSpacing: 0.8,
  },
  countryDialCode: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.gold.light,
  },
  emptyCountryText: {
    paddingVertical: spacing.lg,
    textAlign: 'center',
    color: colors.text.secondary,
  },
  inputError: { borderColor: colors.status.error },
  errorText: { fontSize: typography.size.xs, color: colors.status.error },
});

export default RequestJoinScreen;
