import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  getPaymentConfig,
  getPaystackRate,
  PaymentConfig,
  PaystackRateInfo,
} from "../services/paymentsService";

// The org's payment setup plus the current Naira rate, refreshed whenever the
// screen comes into focus so members always see the latest rate.
export const usePaystackRate = () => {
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [rateInfo, setRateInfo] = useState<PaystackRateInfo | null>(null);
  const [rateLoaded, setRateLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getPaymentConfig()
        .catch((): PaymentConfig => ({ enabledProviders: [] }))
        .then(async (nextConfig) => {
          if (!active) {
            return;
          }
          setConfig(nextConfig);
          if (!nextConfig.enabledProviders.includes("paystack")) {
            setRateInfo(null);
            setRateLoaded(true);
            return;
          }
          const nextRate = await getPaystackRate().catch(() => null);
          if (active) {
            setRateInfo(nextRate);
            setRateLoaded(true);
          }
        });
      return () => {
        active = false;
      };
    }, []),
  );

  const paystackEnabled = !!config?.enabledProviders.includes("paystack");
  return {
    config,
    rateInfo,
    paystackEnabled,
    loading: !config || !rateLoaded,
    // The rate Naira payments are priced at; null = Naira payments unavailable.
    nairaRate: paystackEnabled ? rateInfo?.inUse ?? null : null,
  };
};
