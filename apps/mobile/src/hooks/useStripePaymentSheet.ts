import { useStripe } from "@stripe/stripe-react-native";
import { env } from "../config/env";

// Opens Stripe's PaymentSheet for a PaymentIntent client secret. Resolves with
// `completed` when the member paid, or an `errorMessage` when the sheet failed
// (a member cancelling yields neither). Setup failures throw.
export const useStripePaymentSheet = () => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  return async (
    clientSecret: string | undefined,
  ): Promise<{ completed: boolean; errorMessage?: string }> => {
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
    if (!presentError) {
      return { completed: true };
    }
    return presentError.code === "Canceled"
      ? { completed: false }
      : { completed: false, errorMessage: presentError.message };
  };
};
