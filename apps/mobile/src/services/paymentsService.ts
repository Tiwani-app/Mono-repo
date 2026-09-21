import { initiatePaymentCallable } from "./cloudFunctionsService";
import { firestore } from "./firebaseHelpers";

export type PaymentProvider = "stripe";
export type PaymentIntentStatus =
  | "pending"
  | "succeeded"
  | "failed"
  | "expired"
  | "refunded";

export interface InitiatePaymentInput {
  targetType: "charge";
  targetId: string;
  provider: PaymentProvider;
}

export interface InitiatePaymentResult {
  intentId: string;
  provider: PaymentProvider;
  clientSecret: string;
}

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
