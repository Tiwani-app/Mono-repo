import {User} from '../types/user';

export const isAdmin = (user: User | null): boolean => user?.role === 'admin';

export const isElectoralChairman = (user: User | null): boolean =>
  user?.role === 'electoral_chairman';

export const canViewElectionResults = (user: User | null): boolean =>
  isAdmin(user) || isElectoralChairman(user);
