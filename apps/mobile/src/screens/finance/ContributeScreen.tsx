import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { Controller, useForm } from "react-hook-form";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStripe } from "@stripe/stripe-react-native";
import KeyboardAwareScroll from "../../components/common/KeyboardAwareScroll";
import EmptyState from "../../components/common/EmptyState";
import FeedbackModal, { FeedbackModalType } from "../../components/common/FeedbackModal";
import GoldButton from "../../components/common/GoldButton";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import OutlineButton from "../../components/common/OutlineButton";
import ScreenHeader from "../../components/common/ScreenHeader";
import { env } from "../../config/env";
import { useContributions } from "../../hooks/useContributions";
import {
  getPaymentConfig,
  initiatePayment,
  PaymentConfig,
  PaymentProvider,
} from "../../services/paymentsService";
import { useAuthStore } from "../../store/authStore";
import {spacing, typography, useThemeColors, useThemedStyles, AppColors} from '../../theme';
import { safeGoBack } from "../../utils/navigation";

interface FormValues {
  amount: string;
}

const ContributeScreen = ({ navigation, route }: any) => {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const { user } = useAuthStore();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const poolId = route.params?.poolId as string | undefined;
  const { activePool, loading } = useContributions(user?.uid);
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [paying, setPaying] = useState(false);
  const [modal, setModal] = useState<{
    visible: boolean;
    type: FeedbackModalType;
    title: string;
    message: string;
  } | null>(null);
  const closeModal = () => setModal(null);
  const { control, handleSubmit, formState, watch } = useForm<FormValues>({
    defaultValues: { amount: "" },
  });

  useEffect(() => {
    getPaymentConfig()
      .then(setConfig)
      .catch(() => setConfig({ enabledProviders: [], paystackExchangeRate: 0 }));
  }, []);

  const amountInput = Number((watch("amount") || "").replace(/,/g, ""));
  const paystackNairaEstimate =
    config && config.paystackExchangeRate > 0 && Number.isFinite(amountInput) && amountInput > 0
      ? Math.round(amountInput * config.paystackExchangeRate)
      : 0;

  const handleBack = () => safeGoBack(navigation, "MyContributions");

  const pool =
    activePool && (!poolId || activePool.id === poolId) ? activePool : null;

  const pay = async (values: FormValues, provider: PaymentProvider) => {
    if (!pool || paying) {
      return;
    }
    const amount = Number(values.amount.replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      setModal({
        visible: true,
        type: "error",
        title: "Amount required",
        message: "Enter an amount greater than zero.",
      });
      return;
    }

    setPaying(true);
    try {
      if (provider === "stripe") {
        const { clientSecret, intentId } = await initiatePayment({
          targetType: "contribution",
          targetId: pool.id,
          amount,
          provider: "stripe",
        });
        if (!clientSecret) {
          throw new Error("Stripe did not return a client secret.");
        }

        const { error: initError } = await initPaymentSheet({
          paymentIntentClientSecret: clientSecret,
          merchantDisplayName: "Tiwani",
          // Only offer Apple Pay when a merchant id is configured — otherwise
          // Stripe throws and blocks card/Google Pay too.
          ...(env.stripeMerchantIdentifier
            ? { applePay: { merchantCountryCode: "NG" } }
            : {}),
          googlePay: { merchantCountryCode: "NG", testEnv: __DEV__ },
        });
        if (initError) {
          throw new Error(initError.message);
        }

        const { error: presentError } = await presentPaymentSheet();
        if (presentError) {
          if (presentError.code !== "Canceled") {
            setModal({
              visible: true,
              type: "error",
              title: "Payment not completed",
              message: presentError.message,
            });
          }
          return;
        }

        navigation.replace("PaymentStatus", { intentId });
      } else {
        const { authorizationUrl, intentId } = await initiatePayment({
          targetType: "contribution",
          targetId: pool.id,
          amount,
          provider: "paystack",
        });
        if (!authorizationUrl) {
          throw new Error("Paystack did not return a checkout page.");
        }
        navigation.replace("PaystackCheckout", { authorizationUrl, intentId });
      }
    } catch (payError) {
      setModal({
        visible: true,
        type: "error",
        title: "Could not start payment",
        message:
          payError instanceof Error ? payError.message : "Please try again.",
      });
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!pool || pool.status !== "active") {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Contribute" showBack onBack={handleBack} />
        <EmptyState
          icon="!"
          title="No active pool"
          message="Contributions are only available while a pool is open."
          actionLabel="Back"
          onAction={handleBack}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {modal && (
        <FeedbackModal
          visible={modal.visible}
          type={modal.type}
          title={modal.title}
          message={modal.message}
          primaryLabel="OK"
          onPrimary={closeModal}
        />
      )}
      <ScreenHeader title="Contribute" showBack onBack={handleBack} />
      <KeyboardAwareScroll>
          <Text style={styles.poolName}>{pool.name}</Text>
          <Text style={styles.hint}>
            Choose how much to contribute, then pay below.
          </Text>
          <Controller
            control={control}
            name="amount"
            rules={{
              required: "Amount is required.",
              pattern: { value: /^[0-9,]+$/, message: "Use numbers only." },
            }}
            render={({ field: { onBlur, onChange, value } }) => (
              <TextInput
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.text.tertiary}
                style={[
                  styles.input,
                  formState.errors.amount && styles.inputError,
                ]}
              />
            )}
          />
          {formState.errors.amount && (
            <Text style={styles.errorText}>
              {formState.errors.amount.message}
            </Text>
          )}
          {config?.enabledProviders.includes("stripe") && (
            <GoldButton
              label={paying ? "Starting payment…" : "Contribute with card / Apple Pay / Google Pay"}
              onPress={handleSubmit((values) => pay(values, "stripe"))}
              loading={paying}
              fullWidth
            />
          )}
          {config?.enabledProviders.includes("paystack") &&
            config.paystackExchangeRate > 0 && (
              <OutlineButton
                label={
                  paystackNairaEstimate > 0
                    ? `Contribute ₦${paystackNairaEstimate.toLocaleString()} via bank transfer, USSD or card`
                    : "Contribute with bank transfer, USSD or card (Naira)"
                }
                onPress={handleSubmit((values) => pay(values, "paystack"))}
                disabled={paying}
                fullWidth
              />
            )}
        </KeyboardAwareScroll>
    </SafeAreaView>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  poolName: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
  },
  hint: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
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
  inputError: { borderColor: colors.status.error },
  errorText: { fontSize: typography.size.xs, color: colors.status.error },
});

export default ContributeScreen;
