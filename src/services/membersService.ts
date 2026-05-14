import {Role, User} from '../types/user';
import {delay, mockUsers} from './mockData';

export const subscribeToMembers = (callback: (members: User[]) => void) => {
  callback(mockUsers);
  return () => {};
};

export const getMember = async (uid: string): Promise<User> => {
  await delay();
  const member = mockUsers.find(item => item.uid === uid);
  if (!member) {
    throw new Error('Member not found.');
  }
  return member;
};

export const createMember = async (_data: {
  fullName: string;
  email: string;
  phone: string;
  role: Role;
}): Promise<{uid: string}> => {
  await delay();
  return {uid: `member-${Date.now()}`};
};

export const updateMemberProfile = async (_uid: string, _data: Partial<User>): Promise<void> => {
  await delay();
};
