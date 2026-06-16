export type LedgerType = 'dues' | 'levy' | 'fine' | 'pledge' | 'payment';
export type LedgerPaidStatus = 'unpaid' | 'partial' | 'paid';

export interface LedgerEntry {
  id: string;
  uid: string;
  type: LedgerType;
  label: string;
  amount: number;
  amountPaid: number;
  dueDate: Date | null;
  paid: boolean;
  paidStatus: LedgerPaidStatus;
  paidAt: Date | null;
  paymentMethod?: string;
  reference?: string;
  note: string;
  recordedBy?: string;
  recordedByName?: string;
  recordedByEmail?: string;
  recordedByPhone?: string;
  duesPeriodId?: string;
}

export interface DuesPeriod {
  id: string;
  name: string;
  amount: number;
  dueDate: Date;
  status: 'active' | 'settled' | 'overdue';
  totalMembers: number;
  paidCount: number;
  createdBy?: string;
  createdByName?: string;
  createdByEmail?: string;
  createdByPhone?: string;
}

export interface FinanceContact {
  email?: string;
  label: string;
  name: string;
  phone?: string;
}
