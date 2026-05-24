export type Role = 'admin' | 'electoral_chairman' | 'member';
export type MemberStatus = 'active' | 'inactive' | 'suspended' | 'pending';
export type FinancialStatus = 'green' | 'red';

export interface Child {
  name: string;
  dateOfBirth: string;
}

export interface NotificationPreferences {
  events: boolean;
  finance: boolean;
  voting: boolean;
}

export interface User {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  photoURL: string | null;
  role: Role;
  status: MemberStatus;
  financialStatus: FinancialStatus;
  outstandingBalance: number;
  address: string;
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  dateOfBirth: string;
  spouseName: string | null;
  spouseDateOfBirth: string | null;
  weddingAnniversary: string | null;
  children: Child[];
  memberSince: string;
  notificationPreferences: NotificationPreferences;
  currencySymbol: string;
  timezone: string;
}

export interface JoinRequest {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  message: string;
  status: 'pending' | 'approved' | 'declined';
  createdAt: Date;
  reviewedAt: Date | null;
  reviewedBy: string | null;
}
