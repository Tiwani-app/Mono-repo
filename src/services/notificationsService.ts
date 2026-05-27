import {TiwaniNotification} from '../types/notification';
import {
  firebaseMessaging,
  firebaseMessagingModule,
  getFirebaseClientConfigState,
} from '../config/firebase';
import {delay, mockNotifications} from './mockData';

export type PushRegistrationStatus = 'registered' | 'denied' | 'unavailable';

export interface PushRegistrationResult {
  status: PushRegistrationStatus;
  token: string | null;
  message: string;
}

interface RegisteredPushToken {
  uid: string;
  token: string;
  updatedAt: Date;
}

const registeredPushTokens: Record<string, RegisteredPushToken> = {};

export const subscribeToNotifications = (callback: (items: TiwaniNotification[]) => void) => {
  callback([...mockNotifications].sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime()));
  return () => {};
};

export const registerDevicePushToken = async (
  uid: string,
  token: string,
): Promise<void> => {
  await delay();
  registeredPushTokens[uid] = {
    uid,
    token,
    updatedAt: new Date(),
  };
};

export const getRegisteredPushToken = (uid: string): RegisteredPushToken | null =>
  registeredPushTokens[uid] ?? null;

export const requestPushPermissionAndRegister = async (
  uid: string,
): Promise<PushRegistrationResult> => {
  const configState = getFirebaseClientConfigState();
  if (!configState.ready) {
    return {
      status: 'unavailable',
      token: null,
      message: 'Push notifications are not available in this build yet.',
    };
  }

  try {
    const messagingModule = firebaseMessagingModule();
    const messaging = firebaseMessaging();
    const authorizationStatus = await messaging.requestPermission();
    const authorized =
      authorizationStatus === messagingModule.AuthorizationStatus.AUTHORIZED ||
      authorizationStatus === messagingModule.AuthorizationStatus.PROVISIONAL;

    if (!authorized) {
      return {
        status: 'denied',
        token: null,
        message: 'Notification permission was not granted.',
      };
    }

    const token = await messaging.getToken();
    await registerDevicePushToken(uid, token);
    return {
      status: 'registered',
      token,
      message: 'Push notifications are enabled.',
    };
  } catch {
    return {
      status: 'unavailable',
      token: null,
      message: 'Push notifications are not available in this build yet.',
    };
  }
};
