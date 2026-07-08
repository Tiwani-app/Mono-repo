import {
  requireFirebaseApp,
  firebaseAuth,
  setCrashlyticsUserContext,
} from "../config/firebase";
import { User } from "../types/user";
import { getLocalTimezone } from "../utils/locale";
import { userFromRecord } from "./converters/userConverter";
import { firestore, getUserRecord } from "./firebaseHelpers";
import { clearSessionActivity, markSessionActive } from "./sessionService";

const authError = (code: string) => ({ code });

const errorCode = (error: unknown): string =>
  typeof error === "object" && error && "code" in error
    ? String((error as { code?: string }).code)
    : "";

const safeSignOut = async (): Promise<void> => {
  let uid: string | null = null;
  try {
    const auth = firebaseAuth();
    if (!auth.currentUser) {
      await setCrashlyticsUserContext(null);
      return;
    }
    uid = auth.currentUser.uid;
    await auth.signOut();
    await setCrashlyticsUserContext(null);
  } catch (error) {
    if (errorCode(error) !== "auth/no-current-user") {
      throw error;
    }
  } finally {
    if (uid) {
      await clearSessionActivity(uid);
    }
  }
};

const assertActiveAccount = (user: User) => {
  if (user.status !== "active") {
    throw authError(`auth/account-${user.status}`);
  }
};

const getProfile = async (uid: string): Promise<User> => {
  let record;
  try {
    record = await getUserRecord(uid);
  } catch (error) {
    if (error instanceof Error && error.message === "Member profile not found.") {
      throw new Error(
        "This Firebase sign-in exists, but its Tiwani member profile has not been provisioned. Ask an administrator to add or approve this member before signing in.",
      );
    }
    throw error;
  }
  const baseProfile = userFromRecord(record);
  if (baseProfile.status !== "active") {
    return baseProfile;
  }

  const orgId = typeof record.orgId === "string" ? record.orgId.trim() : "";
  if (!orgId) {
    throw new Error(
      'Your Tiwani member profile is missing an organisation. Add an "orgId" field to this user profile before signing in.',
    );
  }
  const organisation = orgId
    ? await firestore().collection("organisations").doc(orgId).get()
    : null;
  return userFromRecord({
    ...record,
    currencySymbol: organisation?.data()?.currencySymbol,
    // Use the device's timezone so the app reflects wherever the member
    // signs in from, not the organisation's home timezone.
    timezone: getLocalTimezone(),
  });
};

export const signIn = async (
  email: string,
  password: string,
): Promise<User> => {
  requireFirebaseApp();
  const credential = await firebaseAuth().signInWithEmailAndPassword(
    email.trim().toLowerCase(),
    password,
  );
  try {
    const profile = await getProfile(credential.user.uid);
    assertActiveAccount(profile);
    await markSessionActive(profile.uid);
    await setCrashlyticsUserContext(profile.uid, profile.role);
    return profile;
  } catch (error) {
    await safeSignOut();
    throw error;
  }
};

export const signOut = async (): Promise<void> => {
  requireFirebaseApp();
  await safeSignOut();
};

export const sendPasswordReset = async (email: string): Promise<void> => {
  requireFirebaseApp();
  await firebaseAuth().sendPasswordResetEmail(email.trim().toLowerCase());
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  try {
    requireFirebaseApp();
    return firebaseAuth().onAuthStateChanged((authUser) => {
      if (!authUser) {
        setCrashlyticsUserContext(null).catch(() => {});
        callback(null);
        return;
      }
      getProfile(authUser.uid)
        .then((profile) => {
          assertActiveAccount(profile);
          setCrashlyticsUserContext(profile.uid, profile.role).catch(() => {});
          callback(profile);
        })
        .catch(async (error) => {
          console.warn("Could not restore the signed-in profile.", error);
          await safeSignOut();
          callback(null);
        });
    });
  } catch (error) {
    console.error("Firebase authentication is not configured.", error);
    callback(null);
    return () => {};
  }
};
