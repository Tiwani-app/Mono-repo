import { User } from "../types/user";
import { delay, mockUsers } from "./mockData";

declare const require: (name: string) => any;

let currentUser: User | null = null;
let hydratedSession = false;
const listeners = new Set<(user: User | null) => void>();
const sessionKey = "tiwani.currentUserUid";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const notify = () => listeners.forEach((listener) => listener(currentUser));

const authError = (code: string) => ({ code });

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const assertValidEmail = (email: string) => {
  if (!email || !emailPattern.test(email)) {
    throw authError("auth/invalid-email");
  }
};

const assertActiveAccount = (user: User) => {
  if (user.status === "pending") {
    throw authError("auth/account-pending");
  }
  if (user.status === "inactive") {
    throw authError("auth/account-inactive");
  }
  if (user.status === "suspended") {
    throw authError("auth/account-suspended");
  }
};

const sessionStorage = () => {
  try {
    const module = require("@react-native-async-storage/async-storage");
    return module.default ?? module;
  } catch {
    return null;
  }
};

const persistSession = async (uid: string | null) => {
  const storage = sessionStorage();
  if (!storage) {
    return;
  }
  try {
    if (uid) {
      await storage.setItem(sessionKey, uid);
    } else {
      await storage.removeItem(sessionKey);
    }
  } catch {
    // Session persistence is best-effort in the mock/Expo Go build.
  }
};

const hydrateSession = async () => {
  if (hydratedSession) {
    return;
  }
  hydratedSession = true;
  const storage = sessionStorage();
  if (!storage) {
    return;
  }
  const uid = await storage.getItem(sessionKey);
  if (!uid) {
    return;
  }
  const user = mockUsers.find((item) => item.uid === uid) ?? null;
  if (user?.status === "active") {
    currentUser = user;
  }
};

export const signIn = async (
  email: string,
  password: string,
): Promise<User> => {
  await delay();
  const normalizedEmail = normalizeEmail(email);
  assertValidEmail(normalizedEmail);
  if (password !== "password") {
    throw authError("auth/wrong-password");
  }
  const user = mockUsers.find(
    (item) => normalizeEmail(item.email) === normalizedEmail,
  );
  if (!user) {
    throw authError("auth/user-not-found");
  }
  assertActiveAccount(user);
  currentUser = user;
  await persistSession(user.uid);
  notify();
  return user;
};

export const signOut = async (): Promise<void> => {
  await delay();
  currentUser = null;
  await persistSession(null);
  notify();
};

export const sendPasswordReset = async (email: string): Promise<void> => {
  await delay();
  const normalizedEmail = normalizeEmail(email);
  assertValidEmail(normalizedEmail);
  const user = mockUsers.find(
    (item) => normalizeEmail(item.email) === normalizedEmail,
  );
  if (!user) {
    throw authError("auth/user-not-found");
  }
  assertActiveAccount(user);
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  listeners.add(callback);
  hydrateSession()
    .catch(() => {
      currentUser = null;
    })
    .finally(() => callback(currentUser));
  return () => {
    listeners.delete(callback);
  };
};
