import type { FirebaseApp } from "@react-native-firebase/app";
import type {
  FirebaseAppCheckTypes,
  ReactNativeFirebaseAppCheckProvider,
} from "@react-native-firebase/app-check";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import type { FirebaseCrashlyticsTypes } from "@react-native-firebase/crashlytics";
import type { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";
import type { FirebaseFunctionsTypes } from "@react-native-firebase/functions";
import type { FirebaseMessagingTypes } from "@react-native-firebase/messaging";
import type { FirebaseStorageTypes } from "@react-native-firebase/storage";
import { NativeModules } from "react-native";
import { env } from "./env";

export interface FirebaseClientConfigState {
  ready: boolean;
  error: string | null;
}

interface FirebaseMessagingModule {
  AuthorizationStatus: {
    AUTHORIZED: unknown;
    PROVISIONAL: unknown;
  };
}

interface AppCheckProviderOptionsMap {
  android?: {
    provider?: "debug" | "playIntegrity";
    debugToken?: string;
  };
  apple?: {
    provider?:
      | "debug"
      | "deviceCheck"
      | "appAttest"
      | "appAttestWithDeviceCheckFallback";
    debugToken?: string;
  };
}

interface NativeFirebaseFactory<T> {
  (): T;
}

interface NativeFirebaseAppRoot {
  apps: FirebaseApp[];
  app(): FirebaseApp;
}

interface NativeFirestoreFactory
  extends NativeFirebaseFactory<FirebaseFirestoreTypes.Module> {
  FieldValue: typeof FirebaseFirestoreTypes.FieldValue;
}

declare const require: (moduleName: string) => unknown;

const nativeFirebaseUnavailableMessage =
  "Firebase native modules are unavailable. Use a development build with the Firebase platform configuration files installed.";

const nativeFirebaseModules = {
  "@react-native-firebase/app": () => require("@react-native-firebase/app"),
  "@react-native-firebase/app-check": () =>
    require("@react-native-firebase/app-check"),
  "@react-native-firebase/auth": () => require("@react-native-firebase/auth"),
  "@react-native-firebase/crashlytics": () =>
    require("@react-native-firebase/crashlytics"),
  "@react-native-firebase/firestore": () =>
    require("@react-native-firebase/firestore"),
  "@react-native-firebase/functions": () =>
    require("@react-native-firebase/functions"),
  "@react-native-firebase/messaging": () =>
    require("@react-native-firebase/messaging"),
  "@react-native-firebase/storage": () =>
    require("@react-native-firebase/storage"),
};

type NativeFirebaseModuleName = keyof typeof nativeFirebaseModules;

const optionalNativeModuleNames = {
  "@react-native-firebase/app-check": "RNFBAppCheckModule",
  "@react-native-firebase/crashlytics": "RNFBCrashlyticsModule",
} as const;

const isOptionalNativeModuleInstalled = (
  moduleName: keyof typeof optionalNativeModuleNames,
): boolean => Boolean(NativeModules[optionalNativeModuleNames[moduleName]]);

const loadNativeDefault = <T>(
  moduleName: NativeFirebaseModuleName,
): T => {
  try {
    const loadedModule = nativeFirebaseModules[moduleName]() as {
      default?: T;
    };
    return loadedModule.default ?? (loadedModule as T);
  } catch {
    throw new Error(nativeFirebaseUnavailableMessage);
  }
};

const loadNativeFactory = <T>(
  moduleName: NativeFirebaseModuleName,
): NativeFirebaseFactory<T> =>
  loadNativeDefault<NativeFirebaseFactory<T>>(moduleName);

let firebaseEmulatorsConfigured = false;
let firebaseRuntimeServicesPromise: Promise<void> | null = null;

const crashlyticsEnabled = () => env.crashlyticsEnabled && !__DEV__;
const appCheckEnabled = () =>
  env.appCheckEnabled && !env.useFirebaseEmulators;

const configureFirebaseDevelopmentEmulators = () => {
  if (!env.useFirebaseEmulators || firebaseEmulatorsConfigured) {
    return;
  }

  const host = env.firebaseEmulatorHost;
  loadNativeFactory<FirebaseAuthTypes.Module>(
    "@react-native-firebase/auth",
  )().useEmulator(`http://${host}:9099`);
  loadNativeFactory<FirebaseFirestoreTypes.Module>(
    "@react-native-firebase/firestore",
  )().useEmulator(host, 8080);
  loadNativeFactory<FirebaseFunctionsTypes.Module>(
    "@react-native-firebase/functions",
  )().useEmulator(host, 5001);
  firebaseEmulatorsConfigured = true;
};

const configureAppCheckProvider = (
  provider: ReactNativeFirebaseAppCheckProvider,
) => {
  const runningDebugProvider = __DEV__ || env.appEnvironment === "development";
  const androidOptions: AppCheckProviderOptionsMap["android"] =
    {
      provider: runningDebugProvider ? "debug" : env.appCheckAndroidProvider,
    };
  const appleOptions: AppCheckProviderOptionsMap["apple"] =
    {
      provider: runningDebugProvider ? "debug" : env.appCheckAppleProvider,
    };

  if (env.appCheckAndroidDebugToken.trim()) {
    androidOptions.debugToken = env.appCheckAndroidDebugToken.trim();
  }

  if (env.appCheckAppleDebugToken.trim()) {
    appleOptions.debugToken = env.appCheckAppleDebugToken.trim();
  }

  provider.configure({
    android: androidOptions,
    apple: appleOptions,
  });
};

const initializeAppCheck = async () => {
  if (!appCheckEnabled()) {
    return;
  }

  if (
    !isOptionalNativeModuleInstalled("@react-native-firebase/app-check")
  ) {
    console.warn(
      "Firebase App Check is enabled in env, but the native App Check module is unavailable in this build.",
    );
    return;
  }

  const appCheck = loadNativeFactory<FirebaseAppCheckTypes.Module>(
    "@react-native-firebase/app-check",
  )();
  const provider = appCheck.newReactNativeFirebaseAppCheckProvider();
  configureAppCheckProvider(provider);
  await appCheck.initializeAppCheck({
    provider,
    isTokenAutoRefreshEnabled: env.appCheckTokenAutoRefreshEnabled,
  });
};

const getCrashlytics = (): FirebaseCrashlyticsTypes.Module | null => {
  if (!crashlyticsEnabled()) {
    return null;
  }

  if (
    !isOptionalNativeModuleInstalled("@react-native-firebase/crashlytics")
  ) {
    console.warn(
      "Firebase Crashlytics is enabled in env, but the native Crashlytics module is unavailable in this build.",
    );
    return null;
  }

  try {
    return loadNativeFactory<FirebaseCrashlyticsTypes.Module>(
      "@react-native-firebase/crashlytics",
    )();
  } catch {
    return null;
  }
};

const initializeCrashlytics = async () => {
  if (!crashlyticsEnabled()) {
    return;
  }

  const crashlytics = getCrashlytics();
  if (!crashlytics) {
    return;
  }

  await crashlytics.setCrashlyticsCollectionEnabled(crashlyticsEnabled());
  crashlytics.log(
    `Tiwani runtime boot ${env.appEnvironment} v${env.appVersion}`,
  );
  await crashlytics.setAttributes({
    app_environment: env.appEnvironment,
    app_version: env.appVersion,
  });
};

export const getFirebaseClientConfigState = (): FirebaseClientConfigState => {
  try {
    const appModule =
      loadNativeDefault<NativeFirebaseAppRoot>("@react-native-firebase/app");
    return appModule.apps?.length
      ? { ready: true, error: null }
      : {
          ready: false,
          error:
            "Firebase has not been configured for this platform. Add the Firebase platform configuration file and rebuild the app.",
        };
  } catch (error) {
    return {
      ready: false,
      error:
        error instanceof Error
          ? error.message
          : nativeFirebaseUnavailableMessage,
    };
  }
};

export const requireFirebaseApp = (): FirebaseApp => {
  const state = getFirebaseClientConfigState();
  if (!state.ready) {
    throw new Error(state.error ?? nativeFirebaseUnavailableMessage);
  }
  configureFirebaseDevelopmentEmulators();
  return loadNativeDefault<NativeFirebaseAppRoot>(
    "@react-native-firebase/app",
  ).app();
};

export const initializeFirebaseRuntimeServices = async (): Promise<void> => {
  if (firebaseRuntimeServicesPromise) {
    return firebaseRuntimeServicesPromise;
  }

  firebaseRuntimeServicesPromise = (async () => {
    requireFirebaseApp();
    await initializeAppCheck();
    await initializeCrashlytics();
  })().catch((error) => {
    firebaseRuntimeServicesPromise = null;
    throw error;
  });

  return firebaseRuntimeServicesPromise;
};

export const setCrashlyticsUserContext = async (
  userId: string | null,
  role?: string,
): Promise<void> => {
  if (!crashlyticsEnabled()) {
    return;
  }

  const crashlytics = getCrashlytics();
  if (!crashlytics) {
    return;
  }

  await crashlytics.setUserId(userId?.trim() || "");
  if (role) {
    await crashlytics.setAttribute("member_role", role);
  }
};

export const recordCrashlyticsError = (
  error: unknown,
  context: string,
): void => {
  if (!crashlyticsEnabled()) {
    return;
  }

  const crashlytics = getCrashlytics();
  if (!crashlytics) {
    return;
  }

  const normalizedError =
    error instanceof Error ? error : new Error(context);
  crashlytics.log(context);
  crashlytics.recordError(normalizedError, context);
};

export const firebaseAuth = (): FirebaseAuthTypes.Module =>
  loadNativeFactory<FirebaseAuthTypes.Module>("@react-native-firebase/auth")();

export const firebaseFirestore = (): FirebaseFirestoreTypes.Module =>
  loadNativeFactory<FirebaseFirestoreTypes.Module>(
    "@react-native-firebase/firestore",
  )();

export const firebaseFirestoreModule = (): NativeFirestoreFactory =>
  loadNativeFactory<FirebaseFirestoreTypes.Module>(
    "@react-native-firebase/firestore",
  ) as NativeFirestoreFactory;

export const firebaseFunctions = (): FirebaseFunctionsTypes.Module =>
  loadNativeFactory<FirebaseFunctionsTypes.Module>(
    "@react-native-firebase/functions",
  )();

export const firebaseMessagingModule = (): FirebaseMessagingModule =>
  loadNativeFactory<FirebaseMessagingTypes.Module>(
    "@react-native-firebase/messaging",
  ) as unknown as FirebaseMessagingModule;

export const firebaseMessaging = (): FirebaseMessagingTypes.Module =>
  loadNativeFactory<FirebaseMessagingTypes.Module>(
    "@react-native-firebase/messaging",
  )();

export const firebaseStorage = (): FirebaseStorageTypes.Module =>
  loadNativeFactory<FirebaseStorageTypes.Module>(
    "@react-native-firebase/storage",
  )();
