import {User} from '../types/user';
import {isAdmin} from './roleGuard';

export const canViewLedgerForMember = (
  viewer: User | null,
  requestedMemberId?: string,
) => {
  if (!viewer) {
    return false;
  }
  return isAdmin(viewer) || !requestedMemberId || requestedMemberId === viewer.uid;
};
