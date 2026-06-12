export type AppEnvironment = "development" | "staging" | "production";

export interface ClientEnv {
  accountDeletionUrl: string;
  appEnvironment: AppEnvironment;
  appVersion: string;
  devLoginEmail: string;
  devLoginPassword: string;
  defaultOrgId: string;
  firebaseEmulatorHost: string;
  financeContactEmail: string;
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

const appEnvironment = parseEnvironment(environmentValue);

export const env: ClientEnv = {
  accountDeletionUrl: process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL ?? "",
  appEnvironment,
  appVersion: process.env.EXPO_PUBLIC_APP_VERSION ?? "2.1.0",
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
  privacyPolicyUrl: process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? "",
  supportUrl: process.env.EXPO_PUBLIC_SUPPORT_URL ?? "",
  termsUrl: process.env.EXPO_PUBLIC_TERMS_URL ?? "",
  useFirebaseEmulators:
    process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS === "true",
};
