import {User} from '../types/user';

export const isAdmin = (user: User | null): boolean => user?.role === 'admin';

export const isElectoralChairman = (user: User | null): boolean =>
  user?.role === 'electoral_chairman';

export const isMember = (user: User | null): boolean =>
  user != null && ['admin', 'electoral_chairman', 'member'].includes(user.role);

export const canVote = (user: User | null): boolean =>
  isMember(user) && user?.financialStatus === 'green';
