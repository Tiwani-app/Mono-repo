import type { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";
import {
  firebaseAuth,
  firebaseFirestore,
  firebaseFirestoreModule,
  requireFirebaseApp,
} from "../config/firebase";
import { DataSyncSnapshotMeta } from "../types/sync";
import { RawRecord } from "./converters/shared";

export const firestore = () => {
  requireFirebaseApp();
  return firebaseFirestore();
};

export const currentUid = (): string => {
  const uid = firebaseAuth().currentUser?.uid;
  if (!uid) {
    throw new Error("You must be signed in to continue.");
  }
  return uid;
};

export const getUserRecord = async (uid: string): Promise<RawRecord> => {
  const snapshot = await firestore().collection("users").doc(uid).get();
  if (!snapshot.exists()) {
    throw new Error("Member profile not found.");
  }
  return { id: snapshot.id, ...(snapshot.data() ?? {}) };
};

export const getCurrentUserRecord = async (): Promise<RawRecord> =>
  getUserRecord(currentUid());

export const getCurrentOrgId = async (): Promise<string> => {
  const record = await getCurrentUserRecord();
  if (typeof record.orgId !== "string" || !record.orgId.trim()) {
    throw new Error("Your organisation membership is not configured.");
  }
  return record.orgId;
};

export const serverTimestamp = () =>
  firebaseFirestoreModule().FieldValue.serverTimestamp();

export const snapshotRecords = (
  snapshot: FirebaseFirestoreTypes.QuerySnapshot,
): RawRecord[] =>
  snapshot.docs.map((document) => ({
    id: document.id,
    ...(document.data() ?? {}),
  }));

export const startOrgSubscription = <T>(
  collectionName: string,
  mapRecord: (record: RawRecord) => T,
  callback: (records: T[]) => void,
  configure?: (
    query: FirebaseFirestoreTypes.Query,
  ) => FirebaseFirestoreTypes.Query,
  onError?: (error: Error) => void,
  onSnapshotMeta?: (meta: DataSyncSnapshotMeta) => void,
) => {
  const database = firestore();
  let unsubscribe = () => {};
  let active = true;
  const handleError = (error: unknown) => {
    const nextError =
      error instanceof Error
        ? error
        : new Error(`Could not subscribe to ${collectionName}.`);
    console.warn(`Could not subscribe to ${collectionName}.`, nextError);
    if (!active) {
      return;
    }
    if (onError) {
      onError(nextError);
      return;
    }
    callback([]);
  };

  getCurrentOrgId()
    .then((orgId) => {
      if (!active) {
        return;
      }
      const baseQuery = database
        .collection(collectionName)
        .where("orgId", "==", orgId);
      const query = configure ? configure(baseQuery) : baseQuery;
      unsubscribe = query.onSnapshot(
        { includeMetadataChanges: true },
        (snapshot) => {
          try {
            onSnapshotMeta?.({
              fromCache: snapshot.metadata.fromCache,
              hasPendingWrites: snapshot.metadata.hasPendingWrites,
            });
            const records = snapshotRecords(snapshot);
            const mappedRecords = records.flatMap((record) => {
              try {
                return [mapRecord(record)];
              } catch (error) {
                console.warn(
                  `Skipped malformed ${collectionName} record ${String(record.id)}.`,
                  error,
                );
                return [];
              }
            });
            callback(mappedRecords);
          } catch (error) {
            handleError(error);
          }
        },
        handleError,
      );
    })
    .catch(handleError);

  return () => {
    active = false;
    unsubscribe();
  };
};
