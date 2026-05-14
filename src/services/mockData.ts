import {TiwaniEvent} from '../types/event';
import {DuesPeriod, LedgerEntry} from '../types/finance';
import {Listing} from '../types/marketplace';
import {TiwaniNotification} from '../types/notification';
import {Election, Poll} from '../types/voting';
import {User} from '../types/user';

export const mockUsers: User[] = [
  {
    uid: 'admin-1',
    fullName: 'Chukwuemeka Obi',
    email: 'admin@tiwani.app',
    phone: '08034567890',
    photoURL: null,
    role: 'admin',
    status: 'active',
    financialStatus: 'green',
    outstandingBalance: 0,
    address: '12 Association Close, Lagos',
    maritalStatus: 'married',
    dateOfBirth: '1984-04-12',
    spouseName: 'Adaeze Obi',
    spouseDateOfBirth: '1987-11-03',
    weddingAnniversary: '2012-08-18',
    children: [{name: 'Chidera Obi', dateOfBirth: '2016-03-12'}],
    memberSince: '2021-02-01',
    notificationPreferences: {events: true, finance: true, voting: true},
    currencySymbol: '₦',
    timezone: 'WAT',
  },
  {
    uid: 'member-1',
    fullName: 'Tiwalade Adebayo',
    email: 'member@tiwani.app',
    phone: '08098765432',
    photoURL: null,
    role: 'member',
    status: 'active',
    financialStatus: 'red',
    outstandingBalance: 15000,
    address: '8 Unity Avenue, Ikeja',
    maritalStatus: 'single',
    dateOfBirth: '1991-09-22',
    spouseName: null,
    spouseDateOfBirth: null,
    weddingAnniversary: null,
    children: [],
    memberSince: '2023-06-10',
    notificationPreferences: {events: true, finance: true, voting: false},
    currencySymbol: '₦',
    timezone: 'WAT',
  },
  {
    uid: 'chair-1',
    fullName: 'Nkiru Okafor',
    email: 'chair@tiwani.app',
    phone: '08123456789',
    photoURL: null,
    role: 'electoral_chairman',
    status: 'active',
    financialStatus: 'green',
    outstandingBalance: 0,
    address: '4 Palm Grove, Lekki',
    maritalStatus: 'widowed',
    dateOfBirth: '1978-01-18',
    spouseName: null,
    spouseDateOfBirth: null,
    weddingAnniversary: null,
    children: [{name: 'Kamsi Okafor', dateOfBirth: '2009-07-09'}],
    memberSince: '2020-01-15',
    notificationPreferences: {events: true, finance: true, voting: true},
    currencySymbol: '₦',
    timezone: 'WAT',
  },
];

export const mockEvents: TiwaniEvent[] = [
  {
    id: 'event-1',
    title: 'May General Meeting',
    description: 'Monthly meeting to review dues, upcoming activities, and committee reports.',
    category: 'meeting',
    dateTime: new Date('2026-05-16T10:00:00+01:00'),
    location: 'Community Hall, Surulere',
    createdBy: 'admin-1',
    rsvpList: ['admin-1', 'chair-1'],
    capacity: 40,
    attendees: [],
  },
  {
    id: 'event-2',
    title: 'Cooperative Outreach',
    description: 'Volunteer visit and supplies handoff for the local family support programme.',
    category: 'volunteer',
    dateTime: new Date('2026-05-23T09:30:00+01:00'),
    location: 'Ajah Health Centre',
    createdBy: 'admin-1',
    rsvpList: ['member-1'],
    capacity: 20,
    attendees: ['member-1'],
  },
];

export const mockPolls: Poll[] = [
  {
    id: 'poll-1',
    title: 'Meeting Format',
    question: 'How should we host next quarter meetings?',
    status: 'open',
    totalVotes: 18,
    options: [
      {id: 'physical', label: 'Physical meetings', imageURL: null, voteCount: 10},
      {id: 'hybrid', label: 'Hybrid meetings', imageURL: null, voteCount: 8},
    ],
  },
];

export const mockElections: Election[] = [
  {
    id: 'election-1',
    title: '2026 Executive Election',
    ballotType: 'secret',
    status: 'open',
    races: [
      {
        raceId: 'president',
        office: 'President',
        candidates: [
          {uid: 'admin-1', name: 'Chukwuemeka Obi', manifestoLine: 'Transparent dues and stronger committees.', photoURL: null},
          {uid: 'chair-1', name: 'Nkiru Okafor', manifestoLine: 'Fair process and member-first governance.', photoURL: null},
        ],
      },
    ],
  },
];

export const mockLedger: LedgerEntry[] = [
  {id: 'ledger-1', uid: 'member-1', type: 'dues', label: 'Q2 2026 Dues', amount: 15000, dueDate: new Date('2026-06-30'), paid: false, paidAt: null, note: ''},
  {id: 'ledger-2', uid: 'admin-1', type: 'dues', label: 'Q2 2026 Dues', amount: 15000, dueDate: new Date('2026-06-30'), paid: true, paidAt: new Date('2026-05-01'), note: ''},
  {id: 'ledger-3', uid: 'chair-1', type: 'payment', label: 'Bank transfer', amount: 15000, dueDate: null, paid: true, paidAt: new Date('2026-05-02'), note: 'Q2 payment'},
];

export const mockDuesPeriods: DuesPeriod[] = [
  {id: 'dues-1', name: 'Q2 2026 Dues', amount: 15000, dueDate: new Date('2026-06-30'), status: 'active', totalMembers: 3, paidCount: 2},
];

export const mockNotifications: TiwaniNotification[] = [
  {id: 'notif-1', type: 'event', title: 'Meeting reminder', body: 'May General Meeting is this weekend.', sentAt: new Date('2026-05-12T09:00:00+01:00')},
  {id: 'notif-2', type: 'finance', title: 'Dues update', body: 'Q2 dues are now open for payment.', sentAt: new Date('2026-05-10T12:00:00+01:00')},
  {id: 'notif-3', type: 'vote', title: 'Election opened', body: 'The 2026 Executive Election is now active.', sentAt: new Date('2026-05-09T08:30:00+01:00')},
];

export const mockListings: Listing[] = [
  {
    id: 'listing-1',
    title: 'Event Canopy Set',
    price: 85000,
    description: 'Clean 20-seat canopy set available for association events.',
    status: 'available',
    imageURL: null,
    postedBy: 'admin-1',
    postedByName: 'Chukwuemeka Obi',
    contactInstruction: 'WhatsApp the treasurer',
  },
];

export const delay = (ms = 150) => new Promise<void>(resolve => setTimeout(() => resolve(), ms));
