import {useEffect} from 'react';
import {firebaseMessaging} from '../../config/firebase';
import {
  registerDevicePushToken,
  requestPushPermissionAndRegister,
} from '../../services/notificationsService';
import {useAuthStore} from '../../store/authStore';
import {NotificationPreferences} from '../../types/user';

const userWantsPushNotifications = (
  preferences: NotificationPreferences,
) => preferences.events || preferences.finance || preferences.voting;

const PushNotificationRegistrar = () => {
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    if (!user || !userWantsPushNotifications(user.notificationPreferences)) {
      return undefined;
    }

    let active = true;
    let unsubscribe: (() => void) | null = null;

    try {
      const messaging = firebaseMessaging();

      requestPushPermissionAndRegister(user.uid).catch(error => {
        if (active) {
          console.warn('Push notification registration failed.', error);
        }
      });

      unsubscribe = messaging.onTokenRefresh(token => {
        registerDevicePushToken(user.uid, token).catch(error => {
          console.warn('Push token refresh could not be saved.', error);
        });
      });
    } catch (error) {
      console.warn('Push notification messaging is unavailable.', error);
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [user]);

  return null;
};

export default PushNotificationRegistrar;
