import { FinancialStatus, JoinRequest, MemberStatus, Role, User } from '../types/user';
import { delay, mockJoinRequests, mockUsers } from './mockData';

export interface MemberInput {
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  status: MemberStatus;
  financialStatus: FinancialStatus;
  outstandingBalance: number;
  address: string;
}

export interface JoinRequestInput {
  fullName: string;
  email: string;
  phone: string;
  message: string;
}

let members = mockUsers;
let joinRequests = mockJoinRequests;
const memberSubscribers = new Set<(members: User[]) => void>();
const joinRequestSubscribers = new Set<(requests: JoinRequest[]) => void>();

const emitMembers = () => {
  memberSubscribers.forEach(callback => callback([...members]));
};

const emitJoinRequests = () => {
  const snapshot = [...joinRequests].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
  joinRequestSubscribers.forEach(callback => callback(snapshot));
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
  maritalStatus: 'single',
  dateOfBirth: '',
  spouseName: null,
  spouseDateOfBirth: null,
  weddingAnniversary: null,
  children: [],
  memberSince: new Date().toISOString().slice(0, 10),
  notificationPreferences: {events: true, finance: true, voting: true},
  currencySymbol: '₦',
  timezone: 'WAT',
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
  const member = members.find(item => item.uid === uid);
  if (!member) {
    throw new Error('Member not found.');
  }
  return member;
};

export const createMember = async (data: MemberInput): Promise<User> => {
  await delay();
  if (members.some(member => member.email.toLowerCase() === data.email.toLowerCase())) {
    throw new Error('A member with this email already exists.');
  }
  const member = defaultUserFields(data);
  members = [member, ...members];
  emitMembers();
  return member;
};

export const updateMember = async (
  uid: string,
  data: Partial<MemberInput>,
): Promise<void> => {
  await delay();
  members = members.map(member => (member.uid === uid ? {...member, ...data} : member));
  emitMembers();
};

export const updateMemberProfile = async (uid: string, data: Partial<User>): Promise<void> => {
  await delay();
  members = members.map(member => (member.uid === uid ? {...member, ...data} : member));
  emitMembers();
};

export const createJoinRequest = async (data: JoinRequestInput): Promise<void> => {
  await delay();
  joinRequests = [
    {
      ...data,
      id: `join-${Date.now()}`,
      status: 'pending',
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
  status: 'approved' | 'declined',
  reviewedBy: string,
): Promise<void> => {
  await delay();
  const request = joinRequests.find(item => item.id === requestId);
  if (!request) {
    throw new Error('Join request not found.');
  }
  joinRequests = joinRequests.map(item =>
    item.id === requestId
      ? {...item, status, reviewedAt: new Date(), reviewedBy}
      : item,
  );
  if (status === 'approved') {
    const exists = members.some(member => member.email.toLowerCase() === request.email.toLowerCase());
    if (!exists) {
      members = [
        defaultUserFields({
          fullName: request.fullName,
          email: request.email,
          phone: request.phone,
          role: 'member',
          status: 'active',
          financialStatus: 'green',
          outstandingBalance: 0,
          address: '',
        }),
        ...members,
      ];
      emitMembers();
    }
  }
  emitJoinRequests();
};
