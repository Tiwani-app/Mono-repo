import { NotificationType, TiwaniNotification } from "../types/notification";
import { DataSyncSnapshotMeta } from "../types/sync";
import {
  firebaseFirestoreModule,
  firebaseMessaging,
  firebaseMessagingModule,
} from "../config/firebase";
import {
  registerDeviceTokenCallable,
  sendAnnouncementPushCallable,
} from "./cloudFunctionsService";
import { notificationFromRecord } from "./converters/notificationConverter";
import {
  currentUid,
  firestore,
  getCurrentOrgId,
  snapshotRecords,
} from "./firebaseHelpers";

export type PushRegistrationStatus = "registered" | "denied" | "unavailable";

export interface PushRegistrationResult {
  status: PushRegistrationStatus;
  token: string | null;
  message: string;
}

export interface SendAnnouncementInput {
  title: string;
  body: string;
  type: NotificationType;
}

export interface SendAnnouncementResult {
  success: boolean;
  notifId: string;
  delivered: number;
}

export const sendAnnouncement = async (
  input: SendAnnouncementInput,
): Promise<SendAnnouncementResult> => {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || !body) {
    throw new Error("Announcement title and message are required.");
  }
  if (title.length > 120) {
    throw new Error("Announcement title must be 120 characters or less.");
  }
  if (body.length > 1000) {
    throw new Error("Announcement message must be 1000 characters or less.");
  }
  return sendAnnouncementPushCallable({ ...input, body, title });
};

export const subscribeToNotifications = (
  callback: (items: TiwaniNotification[]) => void,
  onError?: (error: Error) => void,
  onSnapshotMeta?: (meta: DataSyncSnapshotMeta) => void,
) => {
  const database = firestore();
  const uid = currentUid();
  let allNotifications: TiwaniNotification[] = [];
  let personalNotifications: TiwaniNotification[] = [];
  let allMeta: DataSyncSnapshotMeta | null = null;
  let personalMeta: DataSyncSnapshotMeta | null = null;
  let subscriptions: (() => void)[] = [];
  let active = true;
  const handleError = (error: unknown) => {
    const nextError =
      error instanceof Error
        ? error
        : new Error("Could not subscribe to notifications.");
    console.error("Could not subscribe to notifications.", nextError);
    if (!active) {
      return;
    }
    if (onError) {
      onError(nextError);
      return;
    }
    callback([]);
  };

  const emitSnapshotMeta = () => {
    if (!onSnapshotMeta || !allMeta || !personalMeta) {
      return;
    }
    onSnapshotMeta({
      fromCache: allMeta.fromCache || personalMeta.fromCache,
      hasPendingWrites:
        allMeta.hasPendingWrites || personalMeta.hasPendingWrites,
    });
  };

  const emit = () => {
    try {
      const merged = new Map(
        [...allNotifications, ...personalNotifications].map((item) => [
          item.id,
          item,
        ]),
      );
      callback(
        [...merged.values()].sort(
          (left, right) => right.sentAt.getTime() - left.sentAt.getTime(),
        ),
      );
    } catch (error) {
      handleError(error);
    }
  };

  getCurrentOrgId()
    .then((orgId) => {
      if (!active) {
        return;
      }
      const base = database.collection("announcements").where("orgId", "==", orgId);
      subscriptions = [
        base.where("targetAudience", "==", "all").onSnapshot(
          { includeMetadataChanges: true },
          (snapshot) => {
            try {
              allMeta = {
                fromCache: snapshot.metadata.fromCache,
                hasPendingWrites: snapshot.metadata.hasPendingWrites,
              };
              emitSnapshotMeta();
              allNotifications = snapshotRecords(snapshot).map(notificationFromRecord);
              emit();
            } catch (error) {
              handleError(error);
            }
          },
          handleError,
        ),
        base.where("targetAudience", "==", uid).onSnapshot(
          { includeMetadataChanges: true },
          (snapshot) => {
            try {
              personalMeta = {
                fromCache: snapshot.metadata.fromCache,
                hasPendingWrites: snapshot.metadata.hasPendingWrites,
              };
              emitSnapshotMeta();
              personalNotifications = snapshotRecords(snapshot).map(notificationFromRecord);
              emit();
            } catch (error) {
              handleError(error);
            }
          },
          handleError,
        ),
      ];
    })
    .catch(handleError);

  return () => {
    active = false;
    subscriptions.forEach((unsubscribe) => unsubscribe());
  };
};

export const registerDevicePushToken = async (
  _uid: string,
  token: string,
): Promise<void> => {
  await registerDeviceTokenCallable(token, "mobile");
};

export const markNotificationRead = async (id: string): Promise<void> => {
  await firestore()
    .collection("announcements")
    .doc(id)
    .update({
      readBy: firebaseFirestoreModule().FieldValue.arrayUnion(currentUid()),
    });
};

export const requestPushPermissionAndRegister = async (
  uid: string,
): Promise<PushRegistrationResult> => {
  try {
    const messaging = firebaseMessaging();
    await messaging.registerDeviceForRemoteMessages();
    const status = await messaging.requestPermission();
    const authorizationStatus = firebaseMessagingModule().AuthorizationStatus;
    const granted =
      status === authorizationStatus.AUTHORIZED ||
      status === authorizationStatus.PROVISIONAL;
    if (!granted) {
      return {
        status: "denied",
        token: null,
        message: "Push notification permission was not granted.",
      };
    }
    const token = await messaging.getToken();
    await registerDevicePushToken(uid, token);
    return {
      status: "registered",
      token,
      message: "Push notifications are enabled for this device.",
    };
  } catch (error) {
    return {
      status: "unavailable",
      token: null,
      message:
        error instanceof Error
          ? error.message
          : "Push notifications could not be enabled.",
    };
  }
};
