import { requireFirebaseApp, firebaseAuth } from "../config/firebase";
import { User } from "../types/user";
import { userFromRecord } from "./converters/userConverter";
import { firestore, getUserRecord } from "./firebaseHelpers";

const authError = (code: string) => ({ code });

const errorCode = (error: unknown): string =>
  typeof error === "object" && error && "code" in error
    ? String((error as { code?: string }).code)
    : "";

const safeSignOut = async (): Promise<void> => {
  try {
    const auth = firebaseAuth();
    if (!auth.currentUser) {
      return;
    }
    await auth.signOut();
  } catch (error) {
    if (errorCode(error) !== "auth/no-current-user") {
      throw error;
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
    timezone: organisation?.data()?.timezone,
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
        callback(null);
        return;
      }
      getProfile(authUser.uid)
        .then((profile) => {
          assertActiveAccount(profile);
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
