import { NotificationPreferences, User } from "../types/user";

export interface ProfileFormValues {
  fullName: string;
  phone: string;
  address: string;
  photoURL: string;
}

export const getPreviousProfile = (user: User) => ({
  fullName: user.fullName,
  phone: user.phone,
  address: user.address,
  photoURL: user.photoURL,
});

export const buildProfileUpdate = (values: ProfileFormValues) => ({
  fullName: values.fullName.trim(),
  phone: values.phone.trim(),
  address: values.address.trim(),
  photoURL: values.photoURL.trim() || null,
});

export const buildNotificationPreferences = (
  previousPreferences: NotificationPreferences,
  key: keyof NotificationPreferences,
  value: boolean,
) => ({...previousPreferences, [key]: value});
