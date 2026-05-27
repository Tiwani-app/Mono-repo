import { DuesPeriod, LedgerEntry } from '../types/finance';
import { delay, mockDuesPeriods, mockLedger, mockUsers } from './mockData';

export interface PaymentInput {
  uid: string;
  amount: number;
  paymentMethod: string;
  reference: string;
  note: string;
}

export interface DuesPeriodInput {
  name: string;
  amount: number;
  dueDate: Date;
  status: DuesPeriod['status'];
}

export interface ChargeInput {
  memberIds: string[];
  type: LedgerEntry['type'];
  label: string;
  amount: number;
  dueDate: Date | null;
  note: string;
}

let ledgerEntries = mockLedger.slice();
let duesPeriods = mockDuesPeriods.slice();
const ledgerSubscribers = new Set<{
  uid: string | null;
  callback: (entries: LedgerEntry[]) => void;
}>();

const entriesForUid = (uid: string | null) =>
  uid ? ledgerEntries.filter(entry => entry.uid === uid) : ledgerEntries;

const emitLedger = () => {
  ledgerSubscribers.forEach(subscriber => {
    subscriber.callback(entriesForUid(subscriber.uid));
  });
};

const updateMemberBalance = (uid: string) => {
  const outstandingBalance = ledgerEntries
    .filter(entry => entry.uid === uid && entry.type !== 'payment' && !entry.paid)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const member = mockUsers.find(user => user.uid === uid);
  if (member) {
    member.outstandingBalance = outstandingBalance;
    member.financialStatus = outstandingBalance > 0 ? 'red' : 'green';
  }
};

const refreshDuesPeriods = () => {
  duesPeriods = duesPeriods.map(period => ({
    ...period,
    paidCount: ledgerEntries.filter(
      entry =>
        entry.type !== 'payment' &&
        entry.label === period.name &&
        entry.paid,
    ).length,
  }));
};

export const subscribeToLedger = (
  uid: string | null,
  callback: (entries: LedgerEntry[]) => void,
) => {
  const subscriber = {uid, callback};
  ledgerSubscribers.add(subscriber);
  callback(entriesForUid(uid));
  return () => {
    ledgerSubscribers.delete(subscriber);
  };
};

export const getDuesPeriods = async (): Promise<DuesPeriod[]> => {
  await delay();
  return duesPeriods;
};

export const createDuesPeriod = async (data: DuesPeriodInput): Promise<void> => {
  await delay();
  if (!data.name.trim()) {
    throw new Error('Dues period name is required.');
  }
  if (!Number.isFinite(data.amount) || data.amount <= 0) {
    throw new Error('Dues amount must be greater than zero.');
  }
  const id = `dues-${Date.now()}`;
  const activeMembers = mockUsers.filter(user => user.status === 'active');
  if (activeMembers.length === 0) {
    throw new Error('No active members are available for this dues period.');
  }
  duesPeriods = [
    {
      id,
      name: data.name,
      amount: data.amount,
      dueDate: data.dueDate,
      status: data.status,
      totalMembers: activeMembers.length,
      paidCount: 0,
    },
    ...duesPeriods,
  ];
  ledgerEntries = [
    ...activeMembers.map((member, index) => ({
      id: `ledger-${Date.now()}-${index}`,
      uid: member.uid,
      type: 'dues' as const,
      label: data.name,
      amount: data.amount,
      dueDate: data.dueDate,
      paid: false,
      paidAt: null,
      note: '',
      duesPeriodId: id,
    })),
    ...ledgerEntries,
  ];
  activeMembers.forEach(member => updateMemberBalance(member.uid));
  emitLedger();
};

export const createAdHocCharge = async (data: ChargeInput): Promise<void> => {
  await delay();
  if (data.memberIds.length === 0) {
    throw new Error('Select at least one member for this charge.');
  }
  if (!data.label.trim()) {
    throw new Error('Charge label is required.');
  }
  if (data.type === 'payment') {
    throw new Error('Charges cannot use payment as their type.');
  }
  if (!Number.isFinite(data.amount) || data.amount <= 0) {
    throw new Error('Charge amount must be greater than zero.');
  }
  const missingMember = data.memberIds.find(
    uid => !mockUsers.some(user => user.uid === uid),
  );
  if (missingMember) {
    throw new Error('One or more selected members could not be found.');
  }
  ledgerEntries = [
    ...data.memberIds.map((uid, index) => ({
      id: `ledger-${Date.now()}-${index}`,
      uid,
      type: data.type,
      label: data.label,
      amount: data.amount,
      dueDate: data.dueDate,
      paid: false,
      paidAt: null,
      note: data.note,
    })),
    ...ledgerEntries,
  ];
  data.memberIds.forEach(updateMemberBalance);
  emitLedger();
};

export const recordPayment = async (data: PaymentInput): Promise<void> => {
  await delay();
  if (!mockUsers.some(user => user.uid === data.uid)) {
    throw new Error('Member not found.');
  }
  if (!Number.isFinite(data.amount) || data.amount <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }
  if (!data.paymentMethod.trim()) {
    throw new Error('Payment method is required.');
  }
  const paidAt = new Date();
  let remainingAmount = data.amount;
  ledgerEntries = ledgerEntries.map(entry => {
    if (
      entry.uid !== data.uid ||
      entry.type === 'payment' ||
      entry.paid ||
      remainingAmount <= 0
    ) {
      return entry;
    }
    if (remainingAmount >= entry.amount) {
      remainingAmount -= entry.amount;
      return {
        ...entry,
        paid: true,
        paidAt,
        paymentMethod: data.paymentMethod,
        reference: data.reference,
      };
    }
    return entry;
  });

  ledgerEntries = [
    {
      id: `ledger-${Date.now()}`,
      uid: data.uid,
      type: 'payment',
      label: data.paymentMethod,
      amount: data.amount,
      dueDate: null,
      paid: true,
      paidAt,
      paymentMethod: data.paymentMethod,
      reference: data.reference,
      note: data.note,
    },
    ...ledgerEntries,
  ];

  updateMemberBalance(data.uid);
  refreshDuesPeriods();

  emitLedger();
};
