export const Collections = {
  users: 'users',
  events: 'events',
  polls: 'polls',
  elections: 'elections',
  ledger: 'ledger',
  duesPeriods: 'duesPeriods',
  notifications: 'notifications',
  marketplace: 'marketplace',
} as const;

export const firebaseNotConfiguredMessage =
  'Firebase instances are supplied by the backend integration step.';
