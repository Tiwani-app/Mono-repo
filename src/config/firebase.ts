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

interface FirebaseMessaging {
  requestPermission: () => Promise<unknown>;
  getToken: () => Promise<string>;
}

const nativeFirebaseUnavailableMessage =
  'Firebase native modules are unavailable in this Expo Go/mock build.';

export const getFirebaseClientConfigState = (): FirebaseClientConfigState => {
  return {
    ready: false,
    error: nativeFirebaseUnavailableMessage,
  };
};

export const requireFirebaseApp = (): unknown => {
  throw new Error(nativeFirebaseUnavailableMessage);
};

export const firebaseAuth = (): unknown => {
  throw new Error(nativeFirebaseUnavailableMessage);
};

export const firebaseFirestore = (): unknown => {
  throw new Error(nativeFirebaseUnavailableMessage);
};

export const firebaseMessagingModule = (): FirebaseMessagingModule => {
  throw new Error(nativeFirebaseUnavailableMessage);
};

export const firebaseMessaging = (): FirebaseMessaging => {
  throw new Error(nativeFirebaseUnavailableMessage);
};

export const firebaseStorage = (): unknown => {
  throw new Error(nativeFirebaseUnavailableMessage);
};
