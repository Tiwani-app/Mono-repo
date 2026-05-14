export type LedgerType = 'dues' | 'levy' | 'fine' | 'pledge' | 'payment';

export interface LedgerEntry {
  id: string;
  uid: string;
  type: LedgerType;
  label: string;
  amount: number;
  dueDate: Date | null;
  paid: boolean;
  paidAt: Date | null;
  note: string;
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
