import type { FirebaseApp } from "@react-native-firebase/app";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import type { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";
import type { FirebaseFunctionsTypes } from "@react-native-firebase/functions";
import type { FirebaseMessagingTypes } from "@react-native-firebase/messaging";
import type { FirebaseStorageTypes } from "@react-native-firebase/storage";
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
  "@react-native-firebase/auth": () => require("@react-native-firebase/auth"),
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
