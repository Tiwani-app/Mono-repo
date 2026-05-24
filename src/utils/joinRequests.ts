import {JoinRequest} from '../types/user';

export const getPendingJoinRequests = (requests: JoinRequest[]) =>
  requests.filter(request => request.status === 'pending');

export const formatReadyRequestCount = (count: number) =>
  `${count} request${count === 1 ? '' : 's'} ready`;

export const formatPendingReviewCount = (count: number) =>
  `${count} pending review${count === 1 ? '' : 's'}`;
