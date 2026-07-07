import AsyncStorage from "@react-native-async-storage/async-storage";

export const SESSION_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000;

const lastActiveKey = (uid: string) => `tiwani:session:lastActiveAt:${uid}`;

export const readLastActiveAt = async (uid: string): Promise<number | null> => {
  const value = await AsyncStorage.getItem(lastActiveKey(uid));
  if (!value) {
    return null;
  }
  const timestamp = Number(value);
  return Number.isFinite(timestamp) ? timestamp : null;
};

export const markSessionActive = async (
  uid: string,
  timestamp = Date.now(),
): Promise<void> => {
  await AsyncStorage.setItem(lastActiveKey(uid), String(timestamp));
};

export const clearSessionActivity = async (uid: string): Promise<void> => {
  await AsyncStorage.removeItem(lastActiveKey(uid));
};

export const isSessionExpired = (
  lastActiveAt: number | null,
  now = Date.now(),
): boolean => {
  if (!lastActiveAt) {
    return false;
  }
  return now - lastActiveAt > SESSION_TIMEOUT_MS;
};
