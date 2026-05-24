import {
  formatPendingReviewCount,
  formatReadyRequestCount,
  getPendingJoinRequests,
} from '../utils/joinRequests';
import {JoinRequest} from '../types/user';

const request = (id: string, status: JoinRequest['status']): JoinRequest => ({
  id,
  fullName: `Member ${id}`,
  email: `${id}@example.com`,
  phone: '08000000000',
  message: 'I would like to join.',
  status,
  createdAt: new Date('2026-05-01T10:00:00+01:00'),
  reviewedAt: null,
  reviewedBy: null,
});

describe('join request helpers', () => {
  it('returns only pending requests', () => {
    expect(
      getPendingJoinRequests([
        request('pending-1', 'pending'),
        request('approved-1', 'approved'),
        request('declined-1', 'declined'),
      ]),
    ).toEqual([request('pending-1', 'pending')]);
  });

  it('formats singular and plural request counts', () => {
    expect(formatReadyRequestCount(1)).toBe('1 request ready');
    expect(formatReadyRequestCount(2)).toBe('2 requests ready');
    expect(formatPendingReviewCount(1)).toBe('1 pending review');
    expect(formatPendingReviewCount(3)).toBe('3 pending reviews');
  });
});
