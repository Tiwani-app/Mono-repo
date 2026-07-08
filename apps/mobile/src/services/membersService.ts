import { env } from "../config/env";
import { DataSyncSnapshotMeta } from "../types/sync";
import {
  AccountDeletionRequest,
  FinancialStatus,
  JoinRequest,
  MemberStatus,
  Role,
  User,
} from "../types/user";
import {
  accountDeletionRequestFromRecord,
  joinRequestFromRecord,
  memberDirectoryFromRecord,
  userFromRecord,
} from "./converters/userConverter";
import {
  approveJoinRequestCallable,
  completeAccountDeletionCallable,
  createMemberAccountCallable,
  declineAccountDeletionCallable,
  declineJoinRequestCallable,
  reactivateMemberCallable,
  requestAccountDeletionCallable,
  suspendMemberCallable,
  updateMemberRoleCallable,
} from "./cloudFunctionsService";
import type { SetupDeliveryResult } from "./cloudFunctionsService";
import { firebaseStorage } from "../config/firebase";
import {
  firestore,
  getCurrentOrgId,
  getUserRecord,
  serverTimestamp,
  startOrgSubscription,
} from "./firebaseHelpers";

export interface MemberInput {
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  status: MemberStatus;
  financialStatus: FinancialStatus;
  outstandingBalance: number;
  address: string;
  maritalStatus?: User["maritalStatus"];
  spouseName?: string | null;
  spouseDateOfBirth?: string | null;
  weddingAnniversary?: string | null;
  children?: User["children"];
}

export interface JoinRequestInput {
  fullName: string;
  email: string;
  phone: string;
  message: string;
}

export interface AccountDeletionRequestInput {
  reason: string;
}

export interface AccountDeletionCompletionResult {
  authDeleted: boolean;
  profileAnonymized: boolean;
  profileDeleted: boolean;
  requestId: string;
  tokenCount: number;
}

export interface AccountDeletionReviewResult {
  requestId: string;
}

export interface MemberProvisioningResult {
  setupDelivery: SetupDeliveryResult | null;
}

export type CreatedMember = User & MemberProvisioningResult;

export type MemberProfileUpdateInput = Partial<
  Pick<
    User,
    | "fullName"
    | "phone"
    | "address"
    | "photoURL"
    | "notificationPreferences"
    | "maritalStatus"
    | "dateOfBirth"
    | "spouseName"
    | "spouseDateOfBirth"
    | "weddingAnniversary"
    | "children"
  >
>;

export interface ProfilePhotoUploadFile {
  uri: string;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;

export const isDeletedMemberProfile = (member: User) => {
  const fullName = member.fullName.trim().toLowerCase();
  const email = member.email.trim().toLowerCase();
  return (
    Boolean(member.deletedAt) ||
    Boolean(member.deletionRequestId) ||
    fullName === "deleted member" ||
    (email.startsWith("deleted-") && email.endsWith("@tiwani.local"))
  );
};

const sanitizeStorageFileName = (name: string) =>
  name
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "profile-photo.jpg";

const extensionForImage = (file: ProfilePhotoUploadFile) => {
  const fileName = file.fileName?.trim();
  const existingExtension = fileName?.match(/\.([a-zA-Z0-9]+)$/)?.[1];
  if (existingExtension) {
    return existingExtension.toLowerCase();
  }
  if (file.mimeType === "image/png") {
    return "png";
  }
  if (file.mimeType === "image/webp") {
    return "webp";
  }
  return "jpg";
};

const assertProfilePhotoUpload = (file: ProfilePhotoUploadFile) => {
  if (file.fileSize !== null && file.fileSize !== undefined && file.fileSize > MAX_PROFILE_PHOTO_BYTES) {
    throw new Error("Profile photos must be 5MB or smaller.");
  }
  if (file.mimeType && !file.mimeType.startsWith("image/")) {
    throw new Error("Choose an image file for your profile photo.");
  }
};

const normalizeChildren = (children: User["children"]) =>
  children
    .map((child) => ({
      name: child.name.trim(),
      dateOfBirth: child.dateOfBirth.trim(),
    }))
    .filter((child) => child.name || child.dateOfBirth)
    .map((child) => {
      if (!child.name) {
        throw new Error("Enter a name for each child.");
      }
      return child;
    });

const memberUpdates = (data: Partial<MemberInput>) => ({
  ...data,
  ...(data.fullName !== undefined ? { fullName: data.fullName.trim() } : {}),
  ...(data.email !== undefined ? { email: normalizeEmail(data.email) } : {}),
  ...(data.phone !== undefined ? { phone: data.phone.trim() } : {}),
  ...(data.address !== undefined ? { address: data.address.trim() } : {}),
  ...(data.spouseName !== undefined
    ? { spouseName: data.spouseName?.trim() || null }
    : {}),
  ...(data.spouseDateOfBirth !== undefined
    ? { spouseDateOfBirth: data.spouseDateOfBirth?.trim() || null }
    : {}),
  ...(data.weddingAnniversary !== undefined
    ? { weddingAnniversary: data.weddingAnniversary?.trim() || null }
    : {}),
  ...(data.children !== undefined
    ? { children: normalizeChildren(data.children) }
    : {}),
});

export const subscribeToMembers = (
  callback: (members: User[]) => void,
  onError?: (error: Error) => void,
  onSnapshotMeta?: (meta: DataSyncSnapshotMeta) => void,
) =>
  startOrgSubscription(
    "users",
    userFromRecord,
    (members) => callback(members.filter((member) => !isDeletedMemberProfile(member))),
    undefined,
    onError,
    onSnapshotMeta,
  );

export const subscribeToMemberDirectory = (
  callback: (members: User[]) => void,
  onError?: (error: Error) => void,
  onSnapshotMeta?: (meta: DataSyncSnapshotMeta) => void,
) =>
  startOrgSubscription(
    "member_directory",
    memberDirectoryFromRecord,
    (members) => callback(members.filter((member) => !isDeletedMemberProfile(member))),
    (query) => query.where("status", "==", "active"),
    onError,
    onSnapshotMeta,
  );

export const subscribeToJoinRequests = (
  callback: (requests: JoinRequest[]) => void,
  onError?: (error: Error) => void,
) =>
  startOrgSubscription(
    "join_requests",
    joinRequestFromRecord,
    (requests) =>
      callback(
        requests.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()),
      ),
    undefined,
    onError,
  );

export const subscribeToAccountDeletionRequests = (
  callback: (requests: AccountDeletionRequest[]) => void,
  onError?: (error: Error) => void,
) =>
  startOrgSubscription(
    "account_deletion_requests",
    accountDeletionRequestFromRecord,
    (requests) =>
      callback(
        requests.sort(
          (left, right) =>
            right.requestedAt.getTime() - left.requestedAt.getTime(),
        ),
      ),
    undefined,
    onError,
  );

export const getMember = async (uid: string): Promise<User> => {
  const member = userFromRecord(await getUserRecord(uid));
  if (isDeletedMemberProfile(member)) {
    throw new Error("Member profile not found.");
  }
  return member;
};

export const getMemberDirectoryProfile = async (uid: string): Promise<User> => {
  const snapshot = await firestore().collection("member_directory").doc(uid).get();
  if (!snapshot.exists()) {
    throw new Error("Member profile not found.");
  }
  const member = memberDirectoryFromRecord({ id: snapshot.id, ...(snapshot.data() ?? {}) });
  if (isDeletedMemberProfile(member)) {
    throw new Error("Member profile not found.");
  }
  return member;
};

export const createMember = async (data: MemberInput): Promise<CreatedMember> => {
  const result = await createMemberAccountCallable(data);
  const member = await getMember(result.uid);
  return {
    ...member,
    setupDelivery: {
      setupEmailError: result.setupEmailError,
      setupEmailSent: result.setupEmailSent,
      setupLink: result.setupLink,
    },
  };
};

export const updateMember = async (
  uid: string,
  data: Partial<MemberInput>,
): Promise<void> => {
  const { role, status, ...profileData } = data;
  const profileUpdates = memberUpdates(profileData);
  if (role !== undefined) {
    await updateMemberRoleCallable(uid, role);
  }
  if (status === "suspended") {
    await suspendMemberCallable(uid);
  } else if (status === "active") {
    await reactivateMemberCallable(uid);
  } else if (status !== undefined) {
    profileUpdates.status = status;
  }
  if (Object.keys(profileUpdates).length > 0) {
    await firestore().collection("users").doc(uid).update(profileUpdates);
  }
};

export const updateMemberProfile = async (
  uid: string,
  data: MemberProfileUpdateInput,
): Promise<void> => {
  const update = {
    ...data,
    ...(data.fullName !== undefined ? { fullName: data.fullName.trim() } : {}),
    ...(data.phone !== undefined ? { phone: data.phone.trim() } : {}),
    ...(data.address !== undefined ? { address: data.address.trim() } : {}),
    ...(data.dateOfBirth !== undefined
      ? { dateOfBirth: data.dateOfBirth.trim() }
      : {}),
    ...(data.photoURL !== undefined
      ? { photoURL: data.photoURL?.trim() || null }
      : {}),
    ...(data.spouseName !== undefined
      ? { spouseName: data.spouseName?.trim() || null }
      : {}),
    ...(data.spouseDateOfBirth !== undefined
      ? { spouseDateOfBirth: data.spouseDateOfBirth?.trim() || null }
      : {}),
    ...(data.weddingAnniversary !== undefined
      ? { weddingAnniversary: data.weddingAnniversary?.trim() || null }
      : {}),
    ...(data.children !== undefined
      ? { children: normalizeChildren(data.children) }
      : {}),
  };
  await firestore().collection("users").doc(uid).update(update);
};

export const uploadProfilePhoto = async (
  uid: string,
  file: ProfilePhotoUploadFile,
): Promise<string> => {
  assertProfilePhotoUpload(file);
  const orgId = await getCurrentOrgId();
  const extension = extensionForImage(file);
  const fileName = sanitizeStorageFileName(
    file.fileName ?? `profile-photo-${Date.now()}.${extension}`,
  );
  const storagePath = `organisations/${orgId}/profiles/${uid}/${Date.now()}-${fileName}`;
  const ref = firebaseStorage().ref(storagePath);
  await ref.putFile(file.uri, {
    contentType: file.mimeType ?? `image/${extension === "jpg" ? "jpeg" : extension}`,
  });
  return ref.getDownloadURL();
};

export const requestAccountDeletion = async (
  data: AccountDeletionRequestInput,
): Promise<void> => {
  const reason = data.reason.trim();
  if (!reason) {
    throw new Error("Tell us why you are requesting account deletion.");
  }
  await requestAccountDeletionCallable(reason);
};

export const completeAccountDeletion = async (
  requestId: string,
): Promise<AccountDeletionCompletionResult> => {
  const id = requestId.trim();
  if (!id) {
    throw new Error("Account deletion request is required.");
  }
  const result = await completeAccountDeletionCallable(id);
  return {
    authDeleted: result.authDeleted,
    profileAnonymized: result.profileAnonymized,
    profileDeleted: result.profileDeleted ?? result.profileAnonymized,
    requestId: result.requestId,
    tokenCount: result.tokenCount,
  };
};

export const declineAccountDeletion = async (
  requestId: string,
): Promise<AccountDeletionReviewResult> => {
  const id = requestId.trim();
  if (!id) {
    throw new Error("Account deletion request is required.");
  }
  const result = await declineAccountDeletionCallable(id);
  return { requestId: result.requestId };
};

export const createJoinRequest = async (
  data: JoinRequestInput,
): Promise<void> => {
  const ref = firestore().collection("join_requests").doc();
  await ref.set({
    requestId: ref.id,
    orgId: env.defaultOrgId,
    fullName: data.fullName.trim(),
    email: normalizeEmail(data.email),
    phone: data.phone.trim(),
    message: data.message.trim(),
    status: "pending",
    createdAt: serverTimestamp(),
    reviewedAt: null,
    reviewedBy: null,
  });
};

export const reviewJoinRequest = async (
  requestId: string,
  status: "approved" | "declined",
  _reviewedBy: string,
): Promise<SetupDeliveryResult | null> => {
  if (status === "approved") {
    const result = await approveJoinRequestCallable(requestId);
    return {
      setupEmailError: result.setupEmailError,
      setupEmailSent: result.setupEmailSent,
      setupLink: result.setupLink,
    };
  }
  await declineJoinRequestCallable(requestId);
  return null;
};
