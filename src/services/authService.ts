import {User} from '../types/user';
import {delay, mockUsers} from './mockData';

let currentUser: User | null = null;
const listeners = new Set<(user: User | null) => void>();

const notify = () => listeners.forEach(listener => listener(currentUser));

export const signIn = async (email: string, password: string): Promise<User> => {
  await delay();
  if (password.length < 6) {
    throw {code: 'auth/wrong-password'};
  }
  const user = mockUsers.find(item => item.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    throw {code: 'auth/user-not-found'};
  }
  currentUser = user;
  notify();
  return user;
};

export const signOut = async (): Promise<void> => {
  await delay();
  currentUser = null;
  notify();
};

export const sendPasswordReset = async (_email: string): Promise<void> => {
  await delay();
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  listeners.add(callback);
  callback(currentUser);
  return () => {
    listeners.delete(callback);
  };
};
