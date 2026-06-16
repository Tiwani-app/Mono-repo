export type AppEnvironment = "development" | "staging" | "production";
export type AppCheckAppleProvider =
  | "debug"
  | "deviceCheck"
  | "appAttest"
  | "appAttestWithDeviceCheckFallback";
export type AppCheckAndroidProvider = "debug" | "playIntegrity";

export interface ClientEnv {
  accountDeletionUrl: string;
  appCheckAndroidDebugToken: string;
  appCheckAndroidProvider: AppCheckAndroidProvider;
  appCheckAppleDebugToken: string;
  appCheckAppleProvider: AppCheckAppleProvider;
  appCheckEnabled: boolean;
  appCheckTokenAutoRefreshEnabled: boolean;
  appEnvironment: AppEnvironment;
  appVersion: string;
  crashlyticsEnabled: boolean;
  devLoginEmail: string;
  devLoginPassword: string;
  defaultOrgId: string;
  firebaseEmulatorHost: string;
  financeContactEmail: string;
  financeContactPhone: string;
  privacyPolicyUrl: string;
  supportUrl: string;
  termsUrl: string;
  useFirebaseEmulators: boolean;
}

declare const process: {
  env: Record<string, string | undefined>;
};

const environmentValue = process.env.EXPO_PUBLIC_APP_ENV;

const parseEnvironment = (value: string | undefined): AppEnvironment => {
  if (value === "staging" || value === "production") {
    return value;
  }
  return "development";
};

const parseBoolean = (
  value: string | undefined,
  defaultValue: boolean,
): boolean => {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return defaultValue;
};

const parseAppleProvider = (
  value: string | undefined,
): AppCheckAppleProvider => {
  switch (value) {
    case "debug":
    case "deviceCheck":
    case "appAttest":
    case "appAttestWithDeviceCheckFallback":
      return value;
    default:
      return "appAttestWithDeviceCheckFallback";
  }
};

const parseAndroidProvider = (
  value: string | undefined,
): AppCheckAndroidProvider => {
  switch (value) {
    case "debug":
    case "playIntegrity":
      return value;
    default:
      return "playIntegrity";
  }
};

const appEnvironment = parseEnvironment(environmentValue);

export const env: ClientEnv = {
  accountDeletionUrl: process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL ?? "",
  appCheckAndroidDebugToken:
    process.env.EXPO_PUBLIC_APP_CHECK_ANDROID_DEBUG_TOKEN ?? "",
  appCheckAndroidProvider: parseAndroidProvider(
    process.env.EXPO_PUBLIC_APP_CHECK_ANDROID_PROVIDER,
  ),
  appCheckAppleDebugToken:
    process.env.EXPO_PUBLIC_APP_CHECK_APPLE_DEBUG_TOKEN ?? "",
  appCheckAppleProvider: parseAppleProvider(
    process.env.EXPO_PUBLIC_APP_CHECK_APPLE_PROVIDER,
  ),
  appCheckEnabled: parseBoolean(
    process.env.EXPO_PUBLIC_APP_CHECK_ENABLED,
    false,
  ),
  appCheckTokenAutoRefreshEnabled: parseBoolean(
    process.env.EXPO_PUBLIC_APP_CHECK_TOKEN_AUTO_REFRESH_ENABLED,
    false,
  ),
  appEnvironment,
  appVersion: process.env.EXPO_PUBLIC_APP_VERSION ?? "2.1.0",
  crashlyticsEnabled: parseBoolean(
    process.env.EXPO_PUBLIC_CRASHLYTICS_ENABLED,
    false,
  ),
  devLoginEmail:
    appEnvironment === "production"
      ? ""
      : process.env.EXPO_PUBLIC_DEV_LOGIN_EMAIL ?? "",
  devLoginPassword:
    appEnvironment === "production"
      ? ""
      : process.env.EXPO_PUBLIC_DEV_LOGIN_PASSWORD ?? "",
  defaultOrgId: process.env.EXPO_PUBLIC_DEFAULT_ORG_ID ?? "tiwani-org-v1",
  firebaseEmulatorHost:
    process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST ?? "127.0.0.1",
  financeContactEmail: process.env.EXPO_PUBLIC_FINANCE_CONTACT_EMAIL ?? "",
  financeContactPhone: process.env.EXPO_PUBLIC_FINANCE_CONTACT_PHONE ?? "",
  privacyPolicyUrl: process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? "",
  supportUrl: process.env.EXPO_PUBLIC_SUPPORT_URL ?? "",
  termsUrl: process.env.EXPO_PUBLIC_TERMS_URL ?? "",
  useFirebaseEmulators:
    process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS === "true",
};
