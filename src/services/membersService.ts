import { env } from "../config/env";
import {
  FinancialStatus,
  JoinRequest,
  MemberStatus,
  Role,
  User,
} from "../types/user";
import {
  joinRequestFromRecord,
  userFromRecord,
} from "./converters/userConverter";
import {
  approveJoinRequestCallable,
  completeAccountDeletionCallable,
  createMemberAccountCallable,
  declineJoinRequestCallable,
  reactivateMemberCallable,
  requestAccountDeletionCallable,
  suspendMemberCallable,
  updateMemberRoleCallable,
} from "./cloudFunctionsService";
import type { SetupDeliveryResult } from "./cloudFunctionsService";
import {
  firestore,
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
  requestId: string;
  tokenCount: number;
}

export interface MemberProvisioningResult {
  setupDelivery: SetupDeliveryResult | null;
}

export type CreatedMember = User & MemberProvisioningResult;

export type MemberProfileUpdateInput = Partial<
  Pick<
    User,
    "fullName" | "phone" | "address" | "photoURL" | "notificationPreferences"
  >
>;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

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
) => startOrgSubscription("users", userFromRecord, callback, undefined, onError);

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

export const getMember = async (uid: string): Promise<User> =>
  userFromRecord(await getUserRecord(uid));

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
    ...(data.photoURL !== undefined
      ? { photoURL: data.photoURL?.trim() || null }
      : {}),
  };
  await firestore().collection("users").doc(uid).update(update);
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
    requestId: result.requestId,
    tokenCount: result.tokenCount,
  };
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
