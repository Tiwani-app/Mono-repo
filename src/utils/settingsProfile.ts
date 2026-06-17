import { Child, NotificationPreferences, User } from "../types/user";

export interface ProfileFormValues {
  fullName: string;
  phone: string;
  address: string;
  photoURL: string;
  maritalStatus: User["maritalStatus"];
  dateOfBirth: string;
  spouseName: string;
  spouseDateOfBirth: string;
  weddingAnniversary: string;
  children: Child[];
}

const normalizeChildren = (children: Child[]) =>
  children
    .map((child) => ({
      name: child.name.trim(),
      dateOfBirth: child.dateOfBirth.trim(),
    }))
    .filter((child) => child.name || child.dateOfBirth);

export const getPreviousProfile = (user: User) => ({
  fullName: user.fullName,
  phone: user.phone,
  address: user.address,
  photoURL: user.photoURL,
  maritalStatus: user.maritalStatus,
  dateOfBirth: user.dateOfBirth,
  spouseName: user.spouseName,
  spouseDateOfBirth: user.spouseDateOfBirth,
  weddingAnniversary: user.weddingAnniversary,
  children: user.children,
});

export const buildProfileUpdate = (values: ProfileFormValues) => ({
  fullName: values.fullName.trim(),
  phone: values.phone.trim(),
  address: values.address.trim(),
  photoURL: values.photoURL.trim() || null,
  maritalStatus: values.maritalStatus,
  dateOfBirth: values.dateOfBirth.trim(),
  spouseName: values.spouseName.trim() || null,
  spouseDateOfBirth: values.spouseDateOfBirth.trim() || null,
  weddingAnniversary: values.weddingAnniversary.trim() || null,
  children: normalizeChildren(values.children),
});

export const buildNotificationPreferences = (
  previousPreferences: NotificationPreferences,
  key: keyof NotificationPreferences,
  value: boolean,
) => ({...previousPreferences, [key]: value});
