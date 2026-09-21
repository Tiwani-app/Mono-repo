import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FeedbackModal, { FeedbackModalType } from "../../components/common/FeedbackModal";
import GoldButton from "../../components/common/GoldButton";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ScreenHeader from "../../components/common/ScreenHeader";
import {
  getPaymentConfig,
  setPaystackExchangeRate,
} from "../../services/paymentsService";
import {spacing, typography, useThemeColors, useThemedStyles, AppColors} from '../../theme';
import { safeGoBack } from "../../utils/navigation";

const PaystackRateScreen = ({ navigation }: any) => {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const [rate, setRate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<{
    visible: boolean;
    type: FeedbackModalType;
    title: string;
    message: string;
    onPrimary: () => void;
  } | null>(null);
  const closeModal = () => setModal(null);

  const handleBack = () => safeGoBack(navigation, "FinanceAdmin");

  useEffect(() => {
    getPaymentConfig()
      .then((config) => {
        if (config.paystackExchangeRate > 0) {
          setRate(String(config.paystackExchangeRate));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (saving) {
      return;
    }
    const value = Number(rate.replace(/,/g, ""));
    if (!Number.isFinite(value) || value <= 0) {
      setModal({
        visible: true,
        type: "error",
        title: "Invalid rate",
        message: "Enter a rate greater than zero.",
        onPrimary: closeModal,
      });
      return;
    }
    try {
      setSaving(true);
      await setPaystackExchangeRate(value);
      setModal({
        visible: true,
        type: "success",
        title: "Rate updated",
        message: `Paystack now collects ₦${value.toLocaleString()} per $1.`,
        onPrimary: () => {
          closeModal();
          handleBack();
        },
      });
    } catch (saveError) {
      setModal({
        visible: true,
        type: "error",
        title: "Not updated",
        message:
          saveError instanceof Error ? saveError.message : "Please try again.",
        onPrimary: closeModal,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      {modal && (
        <FeedbackModal
          visible={modal.visible}
          type={modal.type}
          title={modal.title}
          message={modal.message}
          onPrimary={modal.onPrimary}
        />
      )}
      <ScreenHeader title="Paystack Rate" showBack onBack={handleBack} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.hint}>
            Paystack collects Naira for USD dues at this fixed rate. Update it
            weekly so members are charged the right amount.
          </Text>
          <View style={styles.field}>
            <Text style={styles.label}>NAIRA PER $1</Text>
            <TextInput
              value={rate}
              onChangeText={setRate}
              keyboardType="decimal-pad"
              placeholder="1329.87"
              placeholderTextColor={colors.text.tertiary}
              style={styles.input}
            />
          </View>
          <GoldButton
            label={saving ? "Saving…" : "Update Rate"}
            onPress={handleSave}
            loading={saving}
            fullWidth
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  hint: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
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
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.tertiary,
    color: colors.text.primary,
  },
});

export default PaystackRateScreen;
