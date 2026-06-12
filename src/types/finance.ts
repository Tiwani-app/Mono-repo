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
}
