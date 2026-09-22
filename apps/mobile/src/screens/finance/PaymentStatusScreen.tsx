import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "../../components/common/FeatherIcon";
import GoldButton from "../../components/common/GoldButton";
import OutlineButton from "../../components/common/OutlineButton";
import ScreenHeader from "../../components/common/ScreenHeader";
import {
  checkPaymentStatus,
  PaymentIntentRecord,
  PaymentIntentStatus,
  subscribeToPaymentIntent,
} from "../../services/paymentsService";
import {spacing, typography, useThemeColors, useThemedStyles, AppColors} from '../../theme';
import { formatCurrency } from "../../utils/formatCurrency";

const statusCopy: Record<
  PaymentIntentRecord["status"],
  { title: string; message: string }
> = {
  pending: {
    title: "Confirming your payment",
    message: "This usually takes a few seconds.",
  },
  processing: {
    title: "Confirming your payment",
    message: "This usually takes a few seconds.",
  },
  succeeded: {
    title: "Payment successful",
    message: "Your ledger has been updated.",
  },
  failed: {
    title: "Payment failed",
    message: "This payment did not go through. You can try again.",
  },
  expired: {
    title: "Payment expired",
    message: "This payment session timed out. Please try again.",
  },
  refunded: {
    title: "Payment refunded",
    message: "This payment has been refunded.",
  },
};

const PaymentStatusScreen = ({ navigation, route }: any) => {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const intentId = route.params?.intentId as string | undefined;
  const [intent, setIntent] = useState<PaymentIntentRecord | null>(null);
  const [checkedStatus, setCheckedStatus] = useState<PaymentIntentStatus | null>(
    null,
  );
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!intentId) {
      return;
    }
    const unsubscribe = subscribeToPaymentIntent(
      intentId,
      setIntent,
      (subscribeError) => {
        // Never surface raw error codes to members — log and rely on the
        // checkPaymentStatus fallback below to drive the displayed status.
        console.warn("payment status listener error", subscribeError);
      },
    );
    return unsubscribe;
  }, [intentId]);

  // Ask the server to verify with the provider. This is the authoritative
  // fallback: its returned status drives the screen even if the live listener
  // is unavailable. Best-effort, idempotent.
  const runCheck = useCallback(async () => {
    if (!intentId) {
      return;
    }
    setChecking(true);
    try {
      const result = await checkPaymentStatus(intentId);
      setCheckedStatus(result.status);
    } catch (checkError) {
      console.warn("checkPaymentStatus failed", checkError);
    } finally {
      setChecking(false);
    }
  }, [intentId]);

  // Give the webhook a moment, then actively verify if it hasn't landed yet.
  useEffect(() => {
    const timer = setTimeout(runCheck, 1500);
    return () => clearTimeout(timer);
  }, [runCheck]);

  const handleDone = () => {
    navigation.navigate("MyLedger");
  };

  // Prefer the live listener; fall back to the actively-checked status so the
  // screen still resolves if the listener can't read the document.
  const status = intent?.status ?? checkedStatus ?? "pending";
  const copy = statusCopy[status];
  const isInFlight = status === "pending" || status === "processing";
  const isTerminal = !isInFlight;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Payment Status" />
      <View style={styles.content}>
        {isInFlight ? (
          <ActivityIndicator size="large" color={colors.gold.default} />
        ) : (
          <View
            style={[
              styles.iconBox,
              status === "succeeded" ? styles.iconSuccess : styles.iconError,
            ]}
          >
            <Icon
              name={status === "succeeded" ? "check" : "x"}
              size={28}
              color={
                status === "succeeded"
                  ? colors.status.success
                  : colors.status.error
              }
            />
          </View>
        )}
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.message}>{copy.message}</Text>
        {intent && intent.amount > 0 && (
          <Text style={styles.amount}>{formatCurrency(intent.amount)}</Text>
        )}
        {isInFlight && (
          <OutlineButton
            label={checking ? "Checking…" : "Check again"}
            onPress={runCheck}
            disabled={checking}
            fullWidth
          />
        )}
        {isTerminal && (
          <GoldButton label="Back to Ledger" onPress={handleDone} fullWidth />
        )}
      </View>
    </SafeAreaView>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  iconSuccess: { backgroundColor: `${colors.status.success}18` },
  iconError: { backgroundColor: `${colors.status.error}18` },
  title: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
    textAlign: "center",
  },
  message: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: "center",
  },
  amount: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.gold.default,
  },
});

export default PaymentStatusScreen;
