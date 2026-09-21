import React, { useRef } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import EmptyState from "../../components/common/EmptyState";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ScreenHeader from "../../components/common/ScreenHeader";
import { PAYSTACK_RETURN_URL } from "../../services/paymentsService";
import { AppColors, useThemedStyles } from "../../theme";
import { safeGoBack } from "../../utils/navigation";

const PaystackCheckoutScreen = ({ navigation, route }: any) => {
  const styles = useThemedStyles(createStyles);
  const authorizationUrl = route.params?.authorizationUrl as string | undefined;
  const intentId = route.params?.intentId as string | undefined;
  // Paystack can fire the callback redirect more than once; only act once.
  const handledRef = useRef(false);

  const handleBack = () => safeGoBack(navigation, "MyLedger");

  if (!authorizationUrl || !intentId) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Paystack" showBack onBack={handleBack} />
        <EmptyState
          icon="!"
          title="Checkout unavailable"
          message="This payment session could not be opened."
          actionLabel="Back"
          onAction={handleBack}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Paystack Checkout" showBack onBack={handleBack} />
      <WebView
        source={{ uri: authorizationUrl }}
        startInLoadingState
        renderLoading={() => <LoadingSpinner />}
        style={styles.web}
        onShouldStartLoadWithRequest={(request) => {
          // The backend set callback_url to PAYSTACK_RETURN_URL; when Paystack
          // redirects there the flow is done — hand off to PaymentStatus
          // (the webhook + server-side verify are the real source of truth).
          if (request.url.startsWith(PAYSTACK_RETURN_URL)) {
            if (!handledRef.current) {
              handledRef.current = true;
              navigation.replace("PaymentStatus", { intentId });
            }
            return false;
          }
          return true;
        }}
      />
    </SafeAreaView>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  web: { flex: 1 },
});

export default PaystackCheckoutScreen;
