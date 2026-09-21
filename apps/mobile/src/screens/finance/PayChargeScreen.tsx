import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStripe } from "@stripe/stripe-react-native";
import EmptyState from "../../components/common/EmptyState";
import FeedbackModal, { FeedbackModalType } from "../../components/common/FeedbackModal";
import GoldButton from "../../components/common/GoldButton";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ScreenHeader from "../../components/common/ScreenHeader";
import { useFinance } from "../../hooks/useFinance";
import { initiatePayment } from "../../services/paymentsService";
import { useAuthStore } from "../../store/authStore";
import {spacing, typography, useThemedStyles, AppColors} from '../../theme';
import { formatCurrency } from "../../utils/formatCurrency";
import { getChargeOutstanding } from "../../utils/financeTotals";
import { safeGoBack } from "../../utils/navigation";

const PayChargeScreen = ({ navigation, route }: any) => {
  const styles = useThemedStyles(createStyles);
  const { user } = useAuthStore();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const chargeEntryId = route.params?.chargeEntryId as string | undefined;
  const { ledgerEntries, loading } = useFinance(user?.uid);
  const [paying, setPaying] = useState(false);
  const [modal, setModal] = useState<{
    visible: boolean;
    type: FeedbackModalType;
    title: string;
    message: string;
  } | null>(null);
  const closeModal = () => setModal(null);

  const handleBack = () => safeGoBack(navigation, "MyLedger");

  const charge = ledgerEntries.find((entry) => entry.id === chargeEntryId);
  const outstanding = charge ? getChargeOutstanding(charge) : 0;

  const handlePay = async () => {
    if (!charge || paying) {
      return;
    }
    setPaying(true);
    try {
      const { clientSecret, intentId } = await initiatePayment({
        targetType: "charge",
        targetId: charge.id,
        provider: "stripe",
      });

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: "Tiwani",
        applePay: { merchantCountryCode: "NG" },
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
      <ScreenHeader title="Pay Now" showBack onBack={handleBack} />
      {!charge ? (
        <EmptyState
          icon="!"
          title="Charge not found"
          message="This charge is no longer available."
          actionLabel="Back"
          onAction={handleBack}
        />
      ) : (
        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.label}>{charge.label}</Text>
            <Text style={styles.amount}>{formatCurrency(outstanding)}</Text>
            <Text style={styles.hint}>
              Pay the full outstanding balance with card, Apple Pay, or
              Google Pay.
            </Text>
          </View>
          <GoldButton
            label={paying ? "Starting payment…" : "Pay Now"}
            onPress={handlePay}
            disabled={outstanding <= 0}
            loading={paying}
            fullWidth
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  content: { padding: spacing.lg, gap: spacing.lg },
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  label: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  amount: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.black,
    color: colors.gold.default,
  },
  hint: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
});

export default PayChargeScreen;
