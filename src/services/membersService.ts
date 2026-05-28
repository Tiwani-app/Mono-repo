import {
  FinancialStatus,
  JoinRequest,
  MemberStatus,
  Role,
  User,
} from "../types/user";
import { DEFAULT_CURRENCY_SYMBOL, getLocalTimezone } from "../utils/locale";
import { delay, mockJoinRequests, mockUsers } from "./mockData";

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

export type MemberProfileUpdateInput = Partial<
  Pick<
    User,
    "fullName" | "phone" | "address" | "photoURL" | "notificationPreferences"
  >
>;

let members = mockUsers.slice();
let joinRequests = mockJoinRequests.slice();
const memberSubscribers = new Set<(members: User[]) => void>();
const joinRequestSubscribers = new Set<(requests: JoinRequest[]) => void>();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const urlPattern = /^https?:\/\/\S+$/i;

const emitMembers = () => {
  memberSubscribers.forEach((callback) => callback([...members]));
};

const emitJoinRequests = () => {
  const snapshot = [...joinRequests].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
  joinRequestSubscribers.forEach((callback) => callback(snapshot));
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const normalizeMemberInput = (data: MemberInput): MemberInput => ({
  ...data,
  fullName: data.fullName.trim(),
  email: normalizeEmail(data.email),
  phone: data.phone.trim(),
  address: data.address.trim(),
  maritalStatus: data.maritalStatus ?? "single",
  spouseName: data.spouseName?.trim() || null,
  spouseDateOfBirth: data.spouseDateOfBirth?.trim() || null,
  weddingAnniversary: data.weddingAnniversary?.trim() || null,
  children: (data.children ?? [])
    .map((child) => ({
      name: child.name.trim(),
      dateOfBirth: child.dateOfBirth.trim(),
    }))
    .filter((child) => child.name || child.dateOfBirth),
});

const normalizeJoinRequestInput = (
  data: JoinRequestInput,
): JoinRequestInput => ({
  ...data,
  fullName: data.fullName.trim(),
  email: normalizeEmail(data.email),
  phone: data.phone.trim(),
  message: data.message.trim(),
});

const assertValidEmail = (email: string) => {
  if (!email || !emailPattern.test(email)) {
    throw new Error("A valid email is required.");
  }
};

const assertUniqueMemberEmail = (email: string, existingUid?: string) => {
  const duplicate = members.some(
    (member) =>
      member.uid !== existingUid && normalizeEmail(member.email) === email,
  );
  if (duplicate) {
    throw new Error("A member with this email already exists.");
  }
};

const validateMemberInput = (data: MemberInput, existingUid?: string) => {
  if (!data.fullName) {
    throw new Error("Member name is required.");
  }
  assertValidEmail(data.email);
  if (!data.phone) {
    throw new Error("Phone number is required.");
  }
  if (
    !Number.isFinite(data.outstandingBalance) ||
    data.outstandingBalance < 0
  ) {
    throw new Error("Outstanding balance must be zero or more.");
  }
  assertUniqueMemberEmail(data.email, existingUid);
  (data.children ?? []).forEach((child) => {
    if (!child.name) {
      throw new Error("Child name is required when adding a child.");
    }
  });
};

const validateJoinRequestInput = (data: JoinRequestInput) => {
  if (!data.fullName) {
    throw new Error("Full name is required.");
  }
  assertValidEmail(data.email);
  if (!data.phone) {
    throw new Error("Phone number is required.");
  }
  assertUniqueMemberEmail(data.email);
  const hasPendingRequest = joinRequests.some(
    (request) =>
      request.status === "pending" &&
      normalizeEmail(request.email) === data.email,
  );
  if (hasPendingRequest) {
    throw new Error("A pending join request already exists for this email.");
  }
};

const normalizeProfileUpdate = (
  data: MemberProfileUpdateInput,
): MemberProfileUpdateInput => {
  const update: MemberProfileUpdateInput = {};

  if ("fullName" in data && data.fullName !== undefined) {
    update.fullName = data.fullName.trim();
    if (!update.fullName) {
      throw new Error("Full name is required.");
    }
  }

  if ("phone" in data && data.phone !== undefined) {
    update.phone = data.phone.trim();
    if (!update.phone) {
      throw new Error("Phone number is required.");
    }
  }

  if ("address" in data && data.address !== undefined) {
    update.address = data.address.trim();
  }

  if ("photoURL" in data) {
    const photoURL = data.photoURL?.trim() ?? "";
    if (photoURL && !urlPattern.test(photoURL)) {
      throw new Error("A valid photo URL is required.");
    }
    update.photoURL = photoURL || null;
  }

  if ("notificationPreferences" in data && data.notificationPreferences) {
    update.notificationPreferences = data.notificationPreferences;
  }

  return update;
};

const defaultUserFields = (data: MemberInput): User => ({
  uid: `member-${Date.now()}`,
  fullName: data.fullName,
  email: data.email,
  phone: data.phone,
  photoURL: null,
  role: data.role,
  status: data.status,
  financialStatus: data.financialStatus,
  outstandingBalance: data.outstandingBalance,
  address: data.address,
  maritalStatus: data.maritalStatus ?? "single",
  dateOfBirth: "",
  spouseName: data.spouseName ?? null,
  spouseDateOfBirth: data.spouseDateOfBirth ?? null,
  weddingAnniversary: data.weddingAnniversary ?? null,
  children: data.children ?? [],
  memberSince: new Date().toISOString().slice(0, 10),
  notificationPreferences: { events: true, finance: true, voting: true },
  currencySymbol: DEFAULT_CURRENCY_SYMBOL,
  timezone: getLocalTimezone(),
});

export const subscribeToMembers = (callback: (members: User[]) => void) => {
  memberSubscribers.add(callback);
  callback([...members]);
  return () => {
    memberSubscribers.delete(callback);
  };
};

export const subscribeToJoinRequests = (
  callback: (requests: JoinRequest[]) => void,
) => {
  joinRequestSubscribers.add(callback);
  emitJoinRequests();
  return () => {
    joinRequestSubscribers.delete(callback);
  };
};

export const getMember = async (uid: string): Promise<User> => {
  await delay();
  const member = members.find((item) => item.uid === uid);
  if (!member) {
    throw new Error("Member not found.");
  }
  return member;
};

export const createMember = async (data: MemberInput): Promise<User> => {
  await delay();
  const normalized = normalizeMemberInput(data);
  validateMemberInput(normalized);
  const member = defaultUserFields(normalized);
  members = [member, ...members];
  emitMembers();
  return member;
};

export const updateMember = async (
  uid: string,
  data: Partial<MemberInput>,
): Promise<void> => {
  await delay();
  const existingMember = members.find((member) => member.uid === uid);
  if (!existingMember) {
    throw new Error("Member not found.");
  }
  const normalized = normalizeMemberInput({
    fullName: data.fullName ?? existingMember.fullName,
    email: data.email ?? existingMember.email,
    phone: data.phone ?? existingMember.phone,
    role: data.role ?? existingMember.role,
    status: data.status ?? existingMember.status,
    financialStatus: data.financialStatus ?? existingMember.financialStatus,
    outstandingBalance:
      data.outstandingBalance ?? existingMember.outstandingBalance,
    address: data.address ?? existingMember.address,
    maritalStatus: data.maritalStatus ?? existingMember.maritalStatus,
    spouseName:
      data.spouseName === undefined
        ? existingMember.spouseName
        : data.spouseName,
    spouseDateOfBirth:
      data.spouseDateOfBirth === undefined
        ? existingMember.spouseDateOfBirth
        : data.spouseDateOfBirth,
    weddingAnniversary:
      data.weddingAnniversary === undefined
        ? existingMember.weddingAnniversary
        : data.weddingAnniversary,
    children: data.children ?? existingMember.children,
  });
  validateMemberInput(normalized, uid);
  members = members.map((member) =>
    member.uid === uid ? { ...member, ...normalized } : member,
  );
  emitMembers();
};

export const updateMemberProfile = async (
  uid: string,
  data: MemberProfileUpdateInput,
): Promise<void> => {
  await delay();
  if (!members.some((member) => member.uid === uid)) {
    throw new Error("Member not found.");
  }
  const normalized = normalizeProfileUpdate(data);
  members = members.map((member) =>
    member.uid === uid ? { ...member, ...normalized } : member,
  );
  emitMembers();
};

export const createJoinRequest = async (
  data: JoinRequestInput,
): Promise<void> => {
  await delay();
  const normalized = normalizeJoinRequestInput(data);
  validateJoinRequestInput(normalized);
  joinRequests = [
    {
      ...normalized,
      id: `join-${Date.now()}`,
      status: "pending",
      createdAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
    },
    ...joinRequests,
  ];
  emitJoinRequests();
};

export const reviewJoinRequest = async (
  requestId: string,
  status: "approved" | "declined",
  reviewedBy: string,
): Promise<void> => {
  await delay();
  const request = joinRequests.find((item) => item.id === requestId);
  if (!request) {
    throw new Error("Join request not found.");
  }
  if (request.status !== "pending") {
    throw new Error("Join request has already been reviewed.");
  }
  joinRequests = joinRequests.map((item) =>
    item.id === requestId
      ? { ...item, status, reviewedAt: new Date(), reviewedBy }
      : item,
  );
  if (status === "approved") {
    const exists = members.some(
      (member) =>
        normalizeEmail(member.email) === normalizeEmail(request.email),
    );
    if (!exists) {
      members = [
        defaultUserFields({
          fullName: request.fullName,
          email: normalizeEmail(request.email),
          phone: request.phone.trim(),
          role: "member",
          status: "active",
          financialStatus: "green",
          outstandingBalance: 0,
          address: "",
          maritalStatus: "single",
          spouseName: null,
          spouseDateOfBirth: null,
          weddingAnniversary: null,
          children: [],
        }),
        ...members,
      ];
      emitMembers();
    }
  }
  emitJoinRequests();
};
