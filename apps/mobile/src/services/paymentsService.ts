import {
  checkPaymentStatusCallable,
  initiatePaymentCallable,
} from "./cloudFunctionsService";
import { firestore, getCurrentOrgId } from "./firebaseHelpers";

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
  paystackExchangeRate: number; // NGN collected per 1 org-currency unit; 0 if unset
}

// The org's payment setup (organisations/{orgId}.paymentConfig).
export const getPaymentConfig = async (): Promise<PaymentConfig> => {
  const orgId = await getCurrentOrgId();
  const snapshot = await firestore().collection("organisations").doc(orgId).get();
  const config = snapshot.data()?.paymentConfig ?? {};
  const providers = config.enabledProviders;
  const rate = config.paystackExchangeRate;
  return {
    enabledProviders: Array.isArray(providers)
      ? providers.filter(
          (p): p is PaymentProvider => p === "stripe" || p === "paystack",
        )
      : [],
    paystackExchangeRate:
      typeof rate === "number" && rate > 0 ? rate : 0,
  };
};

// Admin-only: update the fixed USD→NGN rate Paystack collects at. Firestore
// rules allow an admin to update their own org doc; the dot-path merges into
// paymentConfig without touching the other fields.
export const setPaystackExchangeRate = async (rate: number): Promise<void> => {
  const orgId = await getCurrentOrgId();
  await firestore()
    .collection("organisations")
    .doc(orgId)
    .update({ "paymentConfig.paystackExchangeRate": rate });
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
