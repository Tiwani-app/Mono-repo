import {
  checkPaymentStatusCallable,
  getPaystackRateCallable,
  initiatePaymentCallable,
} from "./cloudFunctionsService";
import { firestore, getCurrentOrgId, serverTimestamp } from "./firebaseHelpers";

export type PaymentProvider = "stripe" | "paystack";
export type PaymentIntentStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "expired"
  | "refunded";

export type InitiatePaymentInput =
  | { targetType: "charge"; targetId: string; provider: PaymentProvider }
  | {
      targetType: "contribution";
      targetId: string;
      amount: number;
      provider: PaymentProvider;
    };

export interface InitiatePaymentResult {
  intentId: string;
  provider: PaymentProvider;
  clientSecret?: string; // Stripe: PaymentSheet secret
  authorizationUrl?: string; // Paystack: hosted checkout URL to open in the WebView
  gatewayAmount?: number; // Paystack: Naira amount actually collected
  gatewayCurrency?: string; // Paystack: "NGN"
}

export interface PaymentConfig {
  enabledProviders: PaymentProvider[];
}

export type PaystackRateSource = "automatic" | "override" | "manual";

// What getPaystackRate returns (backend payments.ts). `inUse` is the rate
// Naira payments are priced at right now; null means they're unavailable.
export interface PaystackRateInfo {
  bufferPercent: number;
  manualRate: number; // admin's fallback rate; 0 if unset
  manualRateUpdatedAt: string | null;
  automatic: {
    midRate: number;
    source: string;
    fetchedAt: string;
    stale: boolean;
    change24hPercent: number | null;
  } | null;
  inUse: {
    source: PaystackRateSource;
    midRate: number;
    bufferPercent: number;
    appliedRate: number; // NGN per 1 org-currency unit, buffer included
    updatedAt: string | null;
    change24hPercent: number | null;
  } | null;
}

// The org's payment setup (organisations/{orgId}.paymentConfig).
export const getPaymentConfig = async (): Promise<PaymentConfig> => {
  const orgId = await getCurrentOrgId();
  const snapshot = await firestore().collection("organisations").doc(orgId).get();
  const config = snapshot.data()?.paymentConfig ?? {};
  const providers = config.enabledProviders;
  return {
    enabledProviders: Array.isArray(providers)
      ? providers.filter(
          (p): p is PaymentProvider => p === "stripe" || p === "paystack",
        )
      : [],
  };
};

export const getPaystackRate = (): Promise<PaystackRateInfo> =>
  getPaystackRateCallable();

// Admin-only settings for Naira payments. Firestore rules allow an admin to
// update their own org doc; the dot-paths merge into paymentConfig without
// touching the other fields.
//
// The manual rate is only a fallback, used when the automatic rate is missing
// or stale. It keeps its original field name from when it was the only rate.
export const setPaystackSettings = async ({
  bufferPercent,
  manualRate,
}: {
  bufferPercent: number;
  manualRate: number | null; // null = no change
}): Promise<void> => {
  const orgId = await getCurrentOrgId();
  await firestore()
    .collection("organisations")
    .doc(orgId)
    .update({
      "paymentConfig.paystackFxBufferPercent": bufferPercent,
      ...(manualRate !== null
        ? {
            "paymentConfig.paystackExchangeRate": manualRate,
            "paymentConfig.paystackExchangeRateUpdatedAt": serverTimestamp(),
          }
        : {}),
    });
};

// The WebView treats a redirect to this URL as "checkout finished" — matches
// the callback_url the backend hands Paystack (payments.ts PAYSTACK_CALLBACK_URL).
export const PAYSTACK_RETURN_URL = "https://tiwani-backend.web.app/payments/return";

export interface PaymentIntentRecord {
  intentId: string;
  provider: PaymentProvider;
  status: PaymentIntentStatus;
  targetType: "charge" | "contribution";
  targetId: string;
  amount: number;
  currency: string;
  failureReason: string | null;
}

export const initiatePayment = (
  input: InitiatePaymentInput,
): Promise<InitiatePaymentResult> => initiatePaymentCallable(input);

// Ask the server to verify the payment with the provider now (fallback for
// webhook latency). Idempotent; returns the current status.
export const checkPaymentStatus = (
  intentId: string,
): Promise<{ status: PaymentIntentStatus }> =>
  checkPaymentStatusCallable(intentId);

const paymentIntentFromRecord = (
  id: string,
  data: Record<string, unknown>,
): PaymentIntentRecord => ({
  intentId: id,
  provider: (data.provider as PaymentProvider) ?? "stripe",
  status: (data.status as PaymentIntentStatus) ?? "pending",
  targetType: (data.targetType as "charge" | "contribution") ?? "charge",
  targetId: typeof data.targetId === "string" ? data.targetId : "",
  amount: typeof data.amount === "number" ? data.amount : 0,
  currency: typeof data.currency === "string" ? data.currency : "",
  failureReason:
    typeof data.failureReason === "string" ? data.failureReason : null,
});

export const subscribeToPaymentIntent = (
  intentId: string,
  callback: (intent: PaymentIntentRecord | null) => void,
  onError?: (error: Error) => void,
) =>
  firestore()
    .collection("payment_intents")
    .doc(intentId)
    .onSnapshot(
      (snapshot) => {
        if (!snapshot.exists()) {
          callback(null);
          return;
        }
        callback(paymentIntentFromRecord(snapshot.id, snapshot.data() ?? {}));
      },
      (error: Error) => onError?.(error),
    );
