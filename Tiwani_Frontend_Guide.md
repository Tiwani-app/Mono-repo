# Tiwani — Frontend Engineer Guide
### React Native · TypeScript · UI, Navigation & State

> **Your job as frontend engineer:** Build every screen, every component, every navigation flow, and every piece of UI logic in this app.
> You do not write Cloud Functions. You do not configure Firebase services. You do not write Firestore Security Rules.
> You call service functions that the backend engineer provides, render the data they return, and handle every UI state beautifully.

---

## Table of Contents

1. [What You Are Building](#1-what-you-are-building)
2. [Your Tech Stack](#2-your-tech-stack)
3. [Project Setup](#3-project-setup)
4. [Folder Structure — Frontend Only](#4-folder-structure)
5. [TypeScript Types — Know Your Data](#5-typescript-types)
6. [How You Talk to the Backend](#6-how-you-talk-to-the-backend)
7. [Role-Based UI — What Each User Sees](#7-role-based-ui)
8. [Navigation Architecture](#8-navigation-architecture)
9. [State Management with Zustand](#9-state-management)
10. [Custom Hooks](#10-custom-hooks)
11. [Design System — Colours, Spacing, Typography](#11-design-system)
12. [Component Library](#12-component-library)
13. [Screen-by-Screen Build Instructions](#13-screens)
    - [Screen 01 — Splash](#screen-01--splash)
    - [Screen 02 — Login](#screen-02--login)
    - [Screen 03 — Dashboard](#screen-03--dashboard)
    - [Screen 04 — Members List](#screen-04--members-list)
    - [Screen 05 — Member Profile](#screen-05--member-profile)
    - [Screen 06 — Events & Calendar](#screen-06--events--calendar)
    - [Screen 07 — Event Detail](#screen-07--event-detail)
    - [Screen 08 — Voting Hub](#screen-08--voting-hub)
    - [Screen 09 — Cast Poll Vote](#screen-09--cast-poll-vote)
    - [Screen 10 — Election Ballot](#screen-10--election-ballot)
    - [Screen 11 — Finance Admin](#screen-11--finance-admin)
    - [Screen 12 — My Ledger](#screen-12--my-ledger)
    - [Screen 13 — Notifications](#screen-13--notifications)
    - [Screen 14 — Settings](#screen-14--settings)
    - [Screen 15 — Marketplace](#screen-15--marketplace)
14. [UI Rules — Every Screen Must Follow These](#14-ui-rules)
15. [Forms & Validation](#15-forms--validation)
16. [Loading, Empty & Error States](#16-loading-empty--error-states)
17. [Frontend Testing Checklist](#17-testing-checklist)
18. [Building for Release](#18-building-for-release)
19. [Mistakes That Will Cost You Hours](#19-mistakes-to-avoid)

---

## 1. What You Are Building

**Tiwani** is a mobile membership management app for associations and cooperatives. It has 15 screens across 6 functional modules.

### The 6 modules you are building UI for

| Module | Screens you build | Who uses it |
|---|---|---|
| Auth | Splash, Login | Everyone |
| Members | Members List, Member Profile | Admin only (list), All (own profile) |
| Events | Events & Calendar, Event Detail | All |
| Voting | Voting Hub, Poll Vote, Election Ballot | All (if financially clear) |
| Finance | Finance Admin, My Ledger | Admin (admin view), All (own ledger) |
| Other | Dashboard, Notifications, Settings, Marketplace | All |

### The three user roles — your UI changes based on this

| Role | Key UI differences |
|---|---|
| **Admin** | Sees + buttons, admin dashboards, all member data, manage tabs, full finance view |
| **Electoral Chairman** | Sees secret ballot results after election closes; otherwise same as member |
| **Member** | Sees their own data only; no admin controls; no other members' finances |

### The financial status rule — critical for voting UI

Every member has a `financialStatus` of either `'green'` or `'red'`.
- `'green'` → can vote, can run for office, normal UI
- `'red'` → blocked from voting; you must show a gate UI with a message and a link to their ledger

---

## 2. Your Tech Stack

These are the tools you use. Do not swap any of them out without agreement.

| Tool | Purpose | Version |
|---|---|---|
| **React Native** | Mobile framework — one codebase for iOS and Android | 0.74+ |
| **TypeScript** | Required. All files use `.tsx` or `.ts`. No plain JavaScript. | 5.x |
| **React Navigation v6** | All navigation — stack navigators and bottom tabs | 6.x |
| **Zustand** | Global state management — lightweight, no boilerplate | 4.x |
| **React Hook Form** | All forms — handles state, validation, errors cleanly | 7.x |
| **date-fns** | Date formatting and calculation | 3.x |
| **react-native-vector-icons** | Icons — use the **Feather** set exclusively | 10.x |
| **react-native-image-picker** | Picking photos from camera or gallery | 7.x |
| **@react-native-async-storage/async-storage** | Local storage — notification read state, cached prefs | 1.x |
| **@react-native-firebase/auth** | Auth state listener, sign-in, sign-out | 20.x |
| **@react-native-firebase/firestore** | Read data from Firestore — via service functions only | 20.x |
| **@react-native-firebase/storage** | Upload photos to Firebase Storage | 20.x |

### What you do NOT own

- Cloud Functions (backend engineer)
- Firestore Security Rules (backend engineer)
- Firebase project configuration (backend engineer)
- Push notification server logic (backend engineer)

You receive a `services/` folder from the backend engineer with ready-to-call functions. Your job is to call them and render the results.

---

## 3. Project Setup

### Prerequisites — check all of these before starting

```bash
node -v          # must be v18 or higher
npm -v           # must be v9 or higher
java -version    # must be JDK 17 (for Android)
# Xcode 15+ must be installed (Mac, for iOS)
```

### Create the project

```bash
npx react-native init Tiwani --template react-native-template-typescript
cd Tiwani
```

### Install all frontend dependencies

Run each block one at a time. Do not paste all of them at once.

```bash
# 1. Navigation
npm install @react-navigation/native
npm install @react-navigation/native-stack
npm install @react-navigation/bottom-tabs
npm install react-native-screens
npm install react-native-safe-area-context
```

```bash
# 2. Firebase (you use auth, firestore, and storage on the frontend)
npm install @react-native-firebase/app
npm install @react-native-firebase/auth
npm install @react-native-firebase/firestore
npm install @react-native-firebase/storage
npm install @react-native-firebase/messaging
```

```bash
# 3. State, forms, dates
npm install zustand
npm install react-hook-form
npm install date-fns
```

```bash
# 4. UI utilities
npm install react-native-vector-icons
npm install --save-dev @types/react-native-vector-icons
npm install react-native-image-picker
npm install @react-native-async-storage/async-storage
```

```bash
# 5. iOS — run this after all npm installs
cd ios && pod install && cd ..
```

```bash
# 6. Link vector icons
npx react-native link react-native-vector-icons
```

### Verify setup — run the app

```bash
# iOS simulator
npx react-native run-ios

# Android emulator
npx react-native run-android
```

If both launch without errors, you are ready to build.

---

## 4. Folder Structure

Your entire world is inside `src/`. Create every folder and file listed here before writing any component code.

```
src/
│
├── navigation/                       ← NAVIGATION LAYER
│   ├── RootNavigator.tsx             ← top-level: auth vs app decision
│   ├── AuthNavigator.tsx             ← stack: Splash → Login
│   ├── AppNavigator.tsx              ← bottom tab bar (5 tabs)
│   ├── EventsStack.tsx               ← stack: Events → Event Detail
│   ├── VotingStack.tsx               ← stack: Hub → Poll/Election
│   ├── FinanceStack.tsx              ← stack: Finance Admin → My Ledger
│   ├── MoreStack.tsx                 ← stack: Marketplace, Members, Notifs, Settings
│   └── types.ts                      ← ALL route param types live here
│
├── screens/                          ← ONE FILE PER SCREEN
│   ├── auth/
│   │   ├── SplashScreen.tsx          ← Screen 01
│   │   └── LoginScreen.tsx           ← Screen 02
│   ├── members/
│   │   ├── MembersListScreen.tsx     ← Screen 04
│   │   └── MemberProfileScreen.tsx   ← Screen 05
│   ├── events/
│   │   ├── EventsScreen.tsx          ← Screen 06
│   │   └── EventDetailScreen.tsx     ← Screen 07
│   ├── voting/
│   │   ├── VotingHubScreen.tsx       ← Screen 08
│   │   ├── PollVoteScreen.tsx        ← Screen 09
│   │   └── ElectionBallotScreen.tsx  ← Screen 10
│   ├── finance/
│   │   ├── FinanceAdminScreen.tsx    ← Screen 11
│   │   └── MyLedgerScreen.tsx        ← Screen 12
│   ├── DashboardScreen.tsx           ← Screen 03
│   ├── NotificationsScreen.tsx       ← Screen 13
│   ├── SettingsScreen.tsx            ← Screen 14
│   └── MarketplaceScreen.tsx         ← Screen 15
│
├── components/                       ← REUSABLE UI PIECES
│   ├── common/
│   │   ├── Avatar.tsx                ← circular avatar with optional photo
│   │   ├── Badge.tsx                 ← coloured pill label (PAID, OVERDUE, etc.)
│   │   ├── GoldButton.tsx            ← primary filled gold button
│   │   ├── OutlineButton.tsx         ← secondary outlined button
│   │   ├── ScreenHeader.tsx          ← header with title, back, right action
│   │   ├── StatusDot.tsx             ← tiny green/red dot (financial status)
│   │   ├── ProgressBar.tsx           ← horizontal fill bar
│   │   ├── Divider.tsx               ← thin horizontal separator line
│   │   ├── LoadingSpinner.tsx        ← full-screen loading overlay
│   │   └── EmptyState.tsx            ← empty list: icon + message + optional CTA
│   ├── members/
│   │   ├── MemberCard.tsx            ← single row in members list
│   │   └── ProfileTabContent.tsx     ← content for Info / Family / Finance tabs
│   ├── events/
│   │   ├── EventCard.tsx             ← event summary card with progress bar
│   │   └── WeekStrip.tsx             ← 7-day tappable calendar strip
│   ├── voting/
│   │   ├── PollCard.tsx              ← poll preview card in voting hub
│   │   ├── PollOption.tsx            ← single vote option: radio + optional result bar
│   │   └── CandidateCard.tsx         ← candidate row with avatar and radio
│   ├── finance/
│   │   ├── DuesPeriodCard.tsx        ← dues period with collection progress bar
│   │   ├── LedgerRow.tsx             ← single transaction row
│   │   └── BalanceBanner.tsx         ← large balance + GREEN/RED status
│   └── marketplace/
│       ├── ListingCard.tsx           ← member browse card
│       └── AdminListingCard.tsx      ← admin manage card with actions
│
├── store/                            ← ZUSTAND GLOBAL STATE
│   ├── authStore.ts                  ← current user + role
│   ├── membersStore.ts               ← members list + filter + selected member
│   ├── eventsStore.ts                ← events list + selected event
│   ├── votingStore.ts                ← polls + elections + vote state
│   ├── financeStore.ts               ← ledger + dues periods
│   ├── notificationsStore.ts         ← notification list + read IDs
│   └── marketplaceStore.ts           ← listings
│
├── services/                         ← BACKEND CALLS (provided by backend engineer)
│   ├── firebase.ts                   ← Firebase instances + Collections constants
│   ├── authService.ts                ← signIn, signOut, resetPassword, onAuthChange
│   ├── membersService.ts             ← getMembers, getMember, createMember, etc.
│   ├── eventsService.ts              ← getEvents, getEvent, rsvpEvent, checkIn, etc.
│   ├── votingService.ts              ← getPolls, getElections, castVote, hasVoted, etc.
│   ├── financeService.ts             ← getLedger, getDuesPeriods, recordPayment, etc.
│   ├── notificationsService.ts       ← getNotifications, markRead
│   └── marketplaceService.ts         ← getListings, addListing, updateListing, etc.
│
├── hooks/                            ← CUSTOM REACT HOOKS
│   ├── useAuth.ts                    ← session, role, loading
│   ├── useMembers.ts                 ← real-time members list
│   ├── useEvents.ts                  ← real-time events list
│   ├── useVoting.ts                  ← real-time polls and elections
│   ├── useFinance.ts                 ← real-time ledger for current user
│   └── useNotifications.ts           ← notification list + unread count
│
├── theme/                            ← DESIGN TOKENS (single source of truth)
│   ├── colors.ts                     ← every colour in the app
│   ├── typography.ts                 ← font sizes, weights, line heights
│   ├── spacing.ts                    ← spacing scale
│   └── index.ts                      ← re-exports everything from one place
│
├── utils/                            ← PURE HELPER FUNCTIONS
│   ├── formatCurrency.ts             ← number → "₦5,000"
│   ├── formatDate.ts                 ← Timestamp → "Sat, 10 May 2025"
│   ├── roleGuard.ts                  ← isAdmin(), canVote(), etc.
│   └── validators.ts                 ← email, phone, required field checks
│
└── types/                            ← ALL TYPESCRIPT INTERFACES
    ├── user.ts
    ├── event.ts
    ├── voting.ts
    ├── finance.ts
    └── marketplace.ts
```

---

## 5. TypeScript Types — Know Your Data

These are the shapes of data you will receive from service functions. Every screen uses these types. Read them carefully — if you don't understand what a field means, you will render the wrong thing.

### User

```typescript
// src/types/user.ts

export type Role = 'admin' | 'electoral_chairman' | 'member';
export type MemberStatus = 'active' | 'inactive' | 'suspended' | 'pending';
export type FinancialStatus = 'green' | 'red';

export interface Child {
  name: string;          // "Chidera"
  dateOfBirth: string;   // "2016-03-12"
}

export interface User {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  photoURL: string | null;

  role: Role;
  status: MemberStatus;
  financialStatus: FinancialStatus;  // 'green' = may vote, 'red' = blocked
  outstandingBalance: number;         // always a number (Naira), never a string

  address: string;
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  dateOfBirth: string;

  // Only populated if maritalStatus === 'married'
  spouseName: string | null;
  spouseDateOfBirth: string | null;
  weddingAnniversary: string | null;

  children: Child[];

  memberSince: string;   // ISO string — format with date-fns before displaying
  notificationPreferences: {
    events: boolean;
    finance: boolean;
    voting: boolean;
  };
  currencySymbol: string;  // default '₦'
  timezone: string;        // default 'WAT'
}
```

### Event

```typescript
// src/types/event.ts

export type EventCategory = 'meeting' | 'social' | 'volunteer' | 'committee';

// Colour to use for each category — import this wherever you render events
export const CATEGORY_COLORS: Record<EventCategory, string> = {
  meeting:   '#C9962A',  // gold
  social:    '#E74C3C',  // red
  volunteer: '#27AE60',  // green
  committee: '#7A9880',  // grey-green
};

export interface TiwaniEvent {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  dateTime: Date;          // already converted from Timestamp by the service layer
  location: string;
  createdBy: string;       // admin UID
  rsvpList: string[];      // array of member UIDs
  capacity: number;        // 0 = unlimited
  attendees: string[];     // UIDs who actually checked in
}
```

### Voting

```typescript
// src/types/voting.ts

export interface PollOption {
  id: string;
  label: string;
  imageURL: string | null;
  voteCount: number;
}

export interface Poll {
  id: string;
  title: string;
  question: string;
  options: PollOption[];
  status: 'open' | 'closed';
  totalVotes: number;
}

export interface Candidate {
  uid: string | null;
  name: string;
  manifestoLine: string;
  photoURL: string | null;
}

export interface Race {
  raceId: string;
  office: string;          // "President"
  candidates: Candidate[];
}

export interface Election {
  id: string;
  title: string;
  ballotType: 'open' | 'secret';
  races: Race[];
  status: 'open' | 'closed';
}
```

### Finance

```typescript
// src/types/finance.ts

export type LedgerType = 'dues' | 'levy' | 'fine' | 'pledge' | 'payment';

export interface LedgerEntry {
  id: string;
  uid: string;
  type: LedgerType;
  label: string;           // "Q2 2025 Dues"
  amount: number;          // always a positive number
  dueDate: Date | null;    // null for payments
  paid: boolean;
  paidAt: Date | null;
  note: string;
}

export interface DuesPeriod {
  id: string;
  name: string;            // "Q1 2025 Dues"
  amount: number;
  dueDate: Date;
  status: 'active' | 'settled' | 'overdue';
  totalMembers: number;
  paidCount: number;
}
```

### Marketplace

```typescript
// src/types/marketplace.ts

export type ListingStatus = 'available' | 'sold';

export interface Listing {
  id: string;
  title: string;
  price: number;
  description: string;     // max 120 chars
  status: ListingStatus;
  imageURL: string | null;
  postedBy: string;        // admin UID
  postedByName: string;
  contactInstruction: string;
}
```

---

## 6. How You Talk to the Backend

You never write Firestore queries directly in your screen files. You call service functions. The backend engineer provides these. Here is the contract — what each function is called and what it returns. Your screens import and call these.

### Auth Service

```typescript
// src/services/authService.ts — INTERFACE (backend fills the body)

// Signs in with email and password. Returns the user object on success.
// Throws a typed error on failure — catch it and show the correct UI message.
export const signIn: (email: string, password: string) => Promise<User>

// Signs out the current user. RootNavigator auto-redirects to Auth.
export const signOut: () => Promise<void>

// Sends a password reset email.
export const sendPasswordReset: (email: string) => Promise<void>

// Listens to Firebase auth state. Call this in RootNavigator.
// Returns an unsubscribe function — call it on cleanup.
export const onAuthStateChange: (callback: (user: User | null) => void) => () => void
```

### Members Service

```typescript
// src/services/membersService.ts — INTERFACE

// Returns all active members, updates in real-time.
// Returns an unsubscribe function — ALWAYS call it on screen unmount.
export const subscribeToMembers: (
  callback: (members: User[]) => void
) => () => void

// Returns a single member document by UID.
export const getMember: (uid: string) => Promise<User>

// Creates a new member (admin only). Calls a Cloud Function server-side.
export const createMember: (data: {
  fullName: string;
  email: string;
  phone: string;
  role: Role;
}) => Promise<{ uid: string }>

// Updates a member's own editable fields.
export const updateMemberProfile: (uid: string, data: Partial<User>) => Promise<void>
```

### Events Service

```typescript
// src/services/eventsService.ts — INTERFACE

// Real-time events list (future events only, sorted by date ascending).
export const subscribeToEvents: (
  callback: (events: TiwaniEvent[]) => void
) => () => void

// Returns a single event.
export const getEvent: (eventId: string) => Promise<TiwaniEvent>

// Toggles RSVP for the current user.
export const toggleRsvp: (eventId: string, userId: string) => Promise<void>

// Admin: marks a member as checked in.
export const checkInMember: (eventId: string, memberId: string) => Promise<void>

// Admin: creates a new event.
export const createEvent: (data: Omit<TiwaniEvent, 'id' | 'rsvpList' | 'attendees' | 'createdBy'>) => Promise<void>
```

### Voting Service

```typescript
// src/services/votingService.ts — INTERFACE

// Real-time open polls.
export const subscribeToPolls: (
  callback: (polls: Poll[]) => void
) => () => void

// Real-time open elections.
export const subscribeToElections: (
  callback: (elections: Election[]) => void
) => () => void

// Returns true if this user has already voted in this poll.
export const hasCastPollVote: (pollId: string, userId: string) => Promise<boolean>

// Returns true if this user has already voted in this election.
export const hasCastElectionVote: (electionId: string, userId: string) => Promise<boolean>

// Submits a poll vote. Calls a Cloud Function — NEVER write vote counts client-side.
// Throws if user has already voted or is financially red.
export const castPollVote: (pollId: string, optionId: string) => Promise<void>

// Submits a secret or open election ballot. Calls a Cloud Function.
// choices: { [raceId]: candidateName }
export const castElectionBallot: (
  electionId: string,
  choices: Record<string, string>
) => Promise<void>
```

### Finance Service

```typescript
// src/services/financeService.ts — INTERFACE

// Real-time ledger for a specific user UID.
export const subscribeToLedger: (
  uid: string,
  callback: (entries: LedgerEntry[]) => void
) => () => void

// Returns all dues periods (admin).
export const getDuesPeriods: () => Promise<DuesPeriod[]>

// Admin: records a payment against a ledger entry.
export const recordPayment: (entryId: string, amount: number) => Promise<void>

// Admin: creates a new dues period. Calls a Cloud Function.
export const createDuesPeriod: (data: {
  name: string;
  amount: number;
  dueDate: Date;
}) => Promise<void>
```

### Marketplace Service

```typescript
// src/services/marketplaceService.ts — INTERFACE

// Real-time listings (max 2 documents).
export const subscribeToListings: (
  callback: (listings: Listing[]) => void
) => () => void

// Admin: creates a listing. Throws if 2 already exist.
export const createListing: (data: Omit<Listing, 'id' | 'postedBy' | 'postedByName'>) => Promise<void>

// Admin: updates a listing (e.g. mark as sold, edit details).
export const updateListing: (id: string, data: Partial<Listing>) => Promise<void>

// Admin: deletes a listing.
export const deleteListing: (id: string) => Promise<void>
```

---

## 7. Role-Based UI

You control what each role sees **in the UI**. The backend enforces the same rules in Security Rules — your job is to match that in the interface.

### The role guard utility

```typescript
// src/utils/roleGuard.ts

import { User, Role } from '../types/user';

export const isAdmin = (user: User | null): boolean =>
  user?.role === 'admin';

export const isElectoralChairman = (user: User | null): boolean =>
  user?.role === 'electoral_chairman';

// All three roles count as "a member" for basic access
export const isMember = (user: User | null): boolean =>
  user != null && ['admin', 'electoral_chairman', 'member'].includes(user.role);

// Can this user vote? Must be any role AND financially clear
export const canVote = (user: User | null): boolean =>
  isMember(user) && user?.financialStatus === 'green';
```

### How to use role guards in JSX

```tsx
import { isAdmin, canVote } from '../utils/roleGuard';
import { useAuthStore } from '../store/authStore';

const MyScreen = () => {
  const { user } = useAuthStore();

  return (
    <View>
      {/* Only admins see this button */}
      {isAdmin(user) && (
        <AddButton onPress={handleAddMember} />
      )}

      {/* Only show vote button if user can vote */}
      {canVote(user) ? (
        <GoldButton label="Cast Vote" onPress={handleVote} />
      ) : (
        <FinancialGateMessage />  // show the "settle dues" message instead
      )}
    </View>
  );
};
```

### Financial gate component — build this once, use it everywhere

When a user with `financialStatus === 'red'` tries to access voting:

```tsx
// src/components/voting/FinancialGate.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography } from '../../theme';
import GoldButton from '../common/GoldButton';
import OutlineButton from '../common/OutlineButton';

const FinancialGate = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.title}>Dues Outstanding</Text>
      <Text style={styles.body}>
        You are not in good financial standing. Please settle your
        outstanding dues before voting.
      </Text>
      <GoldButton
        label="View My Ledger"
        onPress={() => navigation.navigate('MyLedger')}
        fullWidth
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  icon:  { fontSize: 40 },
  title: { fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: colors.status.error, textAlign: 'center' },
  body:  { fontSize: typography.size.base, color: colors.text.secondary, textAlign: 'center', lineHeight: 22 },
});

export default FinancialGate;
```

---

## 8. Navigation Architecture

### The full navigation tree

```
RootNavigator                        ← watches auth state
│
├── AuthNavigator (Stack)            ← shown when not logged in
│   ├── SplashScreen
│   └── LoginScreen
│
└── AppNavigator (Bottom Tabs)       ← shown when logged in
    │
    ├── Tab 1 — Dashboard
    │   └── DashboardScreen
    │
    ├── Tab 2 — Events (Stack)
    │   ├── EventsScreen
    │   └── EventDetailScreen
    │
    ├── Tab 3 — Voting (Stack)
    │   ├── VotingHubScreen
    │   ├── PollVoteScreen
    │   └── ElectionBallotScreen
    │
    ├── Tab 4 — Finance (Stack)
    │   ├── FinanceAdminScreen       ← admin only (redirect non-admins to MyLedger)
    │   └── MyLedgerScreen
    │
    └── Tab 5 — More (Stack)
        ├── MarketplaceScreen
        ├── MembersListScreen        ← admin only (redirect non-admins to Dashboard)
        ├── MemberProfileScreen
        ├── NotificationsScreen
        └── SettingsScreen
```

### Route type definitions — copy this exactly

```typescript
// src/navigation/types.ts

import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
};

export type EventsStackParamList = {
  EventsList: undefined;
  EventDetail: { eventId: string };
};

export type VotingStackParamList = {
  VotingHub: undefined;
  PollVote: { pollId: string };
  ElectionBallot: { electionId: string };
};

export type FinanceStackParamList = {
  FinanceAdmin: undefined;
  MyLedger: { memberId?: string }; // memberId optional — admin can view any member's ledger
};

export type MoreStackParamList = {
  Marketplace: undefined;
  MembersList: undefined;
  MemberProfile: { memberId: string };
  Notifications: undefined;
  Settings: undefined;
};

export type AppTabParamList = {
  Dashboard: undefined;
  Events: NavigatorScreenParams<EventsStackParamList>;
  Voting: NavigatorScreenParams<VotingStackParamList>;
  Finance: NavigatorScreenParams<FinanceStackParamList>;
  More: NavigatorScreenParams<MoreStackParamList>;
};
```

### RootNavigator — the auth gate

```tsx
// src/navigation/RootNavigator.tsx

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { onAuthStateChange } from '../services/authService';
import { useAuthStore } from '../store/authStore';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import LoadingSpinner from '../components/common/LoadingSpinner';

const RootNavigator = () => {
  const { user, loading, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    // Listen for auth state changes
    // When user logs in: setUser(user) → AppNavigator renders
    // When user logs out: setUser(null) → AuthNavigator renders
    const unsubscribe = onAuthStateChange((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    // Show a spinner while we determine auth state
    return <LoadingSpinner />;
  }

  return (
    <NavigationContainer>
      {user ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default RootNavigator;
```

### AppNavigator — bottom tab bar

```tsx
// src/navigation/AppNavigator.tsx

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Feather';
import { colors } from '../theme';
import DashboardScreen from '../screens/DashboardScreen';
import EventsStack from './EventsStack';
import VotingStack from './VotingStack';
import FinanceStack from './FinanceStack';
import MoreStack from './MoreStack';
import { AppTabParamList } from './types';

const Tab = createBottomTabNavigator<AppTabParamList>();

const AppNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: {
        backgroundColor: colors.bg.secondary,
        borderTopColor: colors.border.subtle,
        paddingBottom: 6,
        height: 60,
      },
      tabBarActiveTintColor: colors.gold.default,
      tabBarInactiveTintColor: colors.text.tertiary,
      tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
      tabBarIcon: ({ color, size }) => {
        const icons: Record<string, string> = {
          Dashboard: 'home',
          Events:    'calendar',
          Voting:    'check-circle',
          Finance:   'credit-card',
          More:      'grid',
        };
        return <Icon name={icons[route.name]} size={size - 2} color={color} />;
      },
    })}
  >
    <Tab.Screen name="Dashboard" component={DashboardScreen} />
    <Tab.Screen name="Events"    component={EventsStack} />
    <Tab.Screen name="Voting"    component={VotingStack} />
    <Tab.Screen name="Finance"   component={FinanceStack} />
    <Tab.Screen name="More"      component={MoreStack} />
  </Tab.Navigator>
);

export default AppNavigator;
```

---

## 9. State Management

Use **Zustand** for all global state. Do not use Redux. Do not use Context API for state that changes frequently.

### The pattern — every store follows this

```typescript
// PATTERN: copy this for every store file

import { create } from 'zustand';

interface SomeState {
  data: SomeType[];
  loading: boolean;
  error: string | null;
  // action functions
  setData: (data: SomeType[]) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
}

export const useSomeStore = create<SomeState>((set) => ({
  data: [],
  loading: false,
  error: null,
  setData: (data) => set({ data }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
```

### Auth Store — the most important one

```typescript
// src/store/authStore.ts

import { create } from 'zustand';
import { User } from '../types/user';

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,           // true on app start until auth state resolves
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
}));
```

### Members Store

```typescript
// src/store/membersStore.ts

import { create } from 'zustand';
import { User } from '../types/user';

interface MembersState {
  members: User[];
  selectedMember: User | null;
  filter: 'all' | 'active' | 'overdue';
  searchQuery: string;
  loading: boolean;
  error: string | null;
  setMembers: (members: User[]) => void;
  setSelectedMember: (member: User | null) => void;
  setFilter: (filter: 'all' | 'active' | 'overdue') => void;
  setSearchQuery: (q: string) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
}

export const useMembersStore = create<MembersState>((set) => ({
  members: [],
  selectedMember: null,
  filter: 'all',
  searchQuery: '',
  loading: false,
  error: null,
  setMembers: (members) => set({ members }),
  setSelectedMember: (member) => set({ selectedMember: member }),
  setFilter: (filter) => set({ filter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
```

### Voting Store

```typescript
// src/store/votingStore.ts

import { create } from 'zustand';
import { Poll, Election } from '../types/voting';

interface VotingState {
  polls: Poll[];
  elections: Election[];
  // Track which option the user has selected (before submitting)
  selectedPollOption: string | null;
  // Track which candidate per race (before submitting)
  electionChoices: Record<string, string>; // { raceId: candidateName }
  hasVotedPoll: boolean;
  hasVotedElection: boolean;
  loading: boolean;
  error: string | null;
  setPolls: (polls: Poll[]) => void;
  setElections: (elections: Election[]) => void;
  setSelectedPollOption: (optionId: string | null) => void;
  setElectionChoice: (raceId: string, candidateName: string) => void;
  setHasVotedPoll: (v: boolean) => void;
  setHasVotedElection: (v: boolean) => void;
  resetElectionChoices: () => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
}

export const useVotingStore = create<VotingState>((set) => ({
  polls: [],
  elections: [],
  selectedPollOption: null,
  electionChoices: {},
  hasVotedPoll: false,
  hasVotedElection: false,
  loading: false,
  error: null,
  setPolls: (polls) => set({ polls }),
  setElections: (elections) => set({ elections }),
  setSelectedPollOption: (selectedPollOption) => set({ selectedPollOption }),
  setElectionChoice: (raceId, candidateName) =>
    set((state) => ({
      electionChoices: { ...state.electionChoices, [raceId]: candidateName },
    })),
  setHasVotedPoll: (hasVotedPoll) => set({ hasVotedPoll }),
  setHasVotedElection: (hasVotedElection) => set({ hasVotedElection }),
  resetElectionChoices: () => set({ electionChoices: {} }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
```

---

## 10. Custom Hooks

Hooks are where you connect the service layer to the store. Each hook subscribes to real-time data, writes it to the store, and handles cleanup.

### The pattern — every hook follows this

```typescript
import { useEffect } from 'react';
import { subscribeToSomething } from '../services/someService';
import { useSomeStore } from '../store/someStore';

export const useSomething = () => {
  const { setData, setLoading, setError } = useSomeStore();

  useEffect(() => {
    setLoading(true);

    // Subscribe to real-time data
    const unsubscribe = subscribeToSomething((data) => {
      setData(data);
      setLoading(false);
    });

    // CRITICAL: always clean up the subscription
    return () => unsubscribe();
  }, []);

  // Return the store state so screens can read it
  return useSomeStore();
};
```

### useAuth

```typescript
// src/hooks/useAuth.ts

import { useEffect } from 'react';
import { onAuthStateChange } from '../services/authService';
import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return useAuthStore();
};
```

### useEvents

```typescript
// src/hooks/useEvents.ts

import { useEffect } from 'react';
import { subscribeToEvents } from '../services/eventsService';
import { useEventsStore } from '../store/eventsStore';

export const useEvents = () => {
  const { setEvents, setLoading, setError } = useEventsStore();

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToEvents((events) => {
      setEvents(events);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return useEventsStore();
};
```

---

## 11. Design System

**Rule: every colour, size, and spacing value must come from the theme. Never hardcode `#FFFFFF` or `16` anywhere in a component or screen.**

### Colours

```typescript
// src/theme/colors.ts

export const colors = {
  // Backgrounds — dark green scale
  bg: {
    primary:   '#050C07',   // darkest: splash, page backgrounds
    secondary: '#091510',   // main app background
    tertiary:  '#0D1E14',   // section backgrounds
    card:      '#142518',   // card surfaces
    elevated:  '#1C3323',   // modals, bottom sheets
  },

  // Brand gold
  gold: {
    default: '#C9962A',
    light:   '#DDB048',
    dark:    '#7A5C1A',
  },

  // Text
  text: {
    primary:   '#EDE7D8',  // main body text on dark backgrounds
    secondary: '#7A9880',  // labels, subtitles, secondary info
    tertiary:  '#3D5848',  // placeholders, disabled, timestamps
    onGold:    '#050C07',  // text placed on gold buttons
  },

  // Semantic
  status: {
    success: '#27AE60',   // paid, good standing, confirmed RSVP
    error:   '#E74C3C',   // overdue, error messages, destructive actions
    info:    '#3B82F6',   // events, info banners
    purple:  '#8B5CF6',   // marketplace
  },

  // Borders
  border: {
    default: '#101A12',
    subtle:  '#1E3224',
  },
};
```

### Spacing

```typescript
// src/theme/spacing.ts

export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  28,
  xxxl: 40,
};
```

### Typography

```typescript
// src/theme/typography.ts

export const typography = {
  size: {
    xs:   10,
    sm:   11,
    base: 13,
    md:   15,
    lg:   17,
    xl:   20,
    xxl:  24,
    xxxl: 32,
  },
  weight: {
    regular:  '400' as const,
    medium:   '500' as const,
    semibold: '600' as const,
    bold:     '700' as const,
    black:    '800' as const,
  },
  lineHeight: {
    tight:  1.2,
    normal: 1.5,
    loose:  1.7,
  },
};
```

### Theme index

```typescript
// src/theme/index.ts
export { colors }     from './colors';
export { spacing }    from './spacing';
export { typography } from './typography';
```

### Utility functions

```typescript
// src/utils/formatCurrency.ts
// Takes a number, returns a formatted string.
// NEVER pass a string to this — amounts are always stored as numbers.
export const formatCurrency = (amount: number, symbol = '₦'): string => {
  return `${symbol}${amount.toLocaleString('en-NG')}`;
};
// formatCurrency(5000)    → "₦5,000"
// formatCurrency(85000)   → "₦85,000"
// formatCurrency(0)       → "₦0"
```

```typescript
// src/utils/formatDate.ts
import { format, formatDistanceToNow } from 'date-fns';

// Full date: "Sat, 10 May 2025"
export const formatEventDate = (date: Date): string =>
  format(date, 'EEE, dd MMM yyyy');

// Time: "10:00 AM"
export const formatEventTime = (date: Date): string =>
  format(date, 'hh:mm aa');

// Short: "10 May"
export const formatShortDate = (date: Date): string =>
  format(date, 'dd MMM');

// Relative: "2 hours ago"
export const formatRelativeTime = (date: Date): string =>
  formatDistanceToNow(date, { addSuffix: true });

// ISO date for display: "Jan 28, 2025"
export const formatDisplayDate = (date: Date): string =>
  format(date, 'MMM dd, yyyy');
```

---

## 12. Component Library

Build these shared components before building any screens. Every screen depends on them.

### GoldButton

```tsx
// src/components/common/GoldButton.tsx

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing, typography } from '../../theme';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;   // shows a spinner instead of label
  fullWidth?: boolean; // stretches to container width
  size?: 'sm' | 'md'; // sm = compact (32px), md = standard (48px)
}

const GoldButton = ({ label, onPress, disabled, loading, fullWidth, size = 'md' }: Props) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled || loading}
    style={[
      styles.base,
      size === 'sm' && styles.sm,
      fullWidth && styles.fullWidth,
      (disabled || loading) && styles.disabled,
    ]}
    activeOpacity={0.8}
  >
    {loading
      ? <ActivityIndicator size="small" color={colors.text.onGold} />
      : <Text style={[styles.label, size === 'sm' && styles.labelSm]}>{label}</Text>
    }
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  base: {
    height: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: 11,
    backgroundColor: colors.gold.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sm: {
    height: 34,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
  },
  fullWidth: { width: '100%' },
  disabled:  { opacity: 0.45 },
  label: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.onGold,
  },
  labelSm: { fontSize: typography.size.sm },
});

export default GoldButton;
```

### OutlineButton

```tsx
// src/components/common/OutlineButton.tsx

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  color?: string;  // border + text colour, defaults to gold
}

const OutlineButton = ({ label, onPress, disabled, fullWidth, color = colors.gold.default }: Props) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    style={[
      styles.base,
      { borderColor: color },
      fullWidth && styles.fullWidth,
      disabled && styles.disabled,
    ]}
    activeOpacity={0.8}
  >
    <Text style={[styles.label, { color }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  base: {
    height: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: 11,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { width: '100%' },
  disabled:  { opacity: 0.45 },
  label: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
});

export default OutlineButton;
```

### Avatar

```tsx
// src/components/common/Avatar.tsx

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, typography } from '../../theme';
import StatusDot from './StatusDot';
import { FinancialStatus } from '../../types/user';

interface Props {
  initials: string;          // "CO" — first letters of first and last name
  photoURL?: string | null;
  size?: number;             // diameter in px, default 38
  statusDot?: FinancialStatus | null; // shows green/red dot if provided
}

const Avatar = ({ initials, photoURL, size = 38, statusDot }: Props) => {
  const fontSize = Math.round(size * 0.37);

  return (
    <View style={{ width: size, height: size }}>
      {photoURL ? (
        <Image
          source={{ uri: photoURL }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <View
          style={[
            styles.initials,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        >
          <Text style={[styles.text, { fontSize }]}>{initials.toUpperCase()}</Text>
        </View>
      )}
      {statusDot && (
        <StatusDot
          status={statusDot}
          style={{ position: 'absolute', bottom: 0, right: 0 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  image:    { borderWidth: 1.5, borderColor: colors.border.subtle },
  initials: {
    backgroundColor: colors.bg.elevated,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: typography.weight.bold,
    color: colors.gold.light,
  },
});

export default Avatar;
```

### Badge

```tsx
// src/components/common/Badge.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { typography, spacing } from '../../theme';

interface Props {
  label: string;
  color: string;  // the semantic colour — e.g. colors.status.success
}

const Badge = ({ label, color }: Props) => (
  <View style={[styles.container, { backgroundColor: color + '22', borderColor: color + '44' }]}>
    <Text style={[styles.label, { color }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.4,
  },
});

export default Badge;
```

### ProgressBar

```tsx
// src/components/common/ProgressBar.tsx

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../theme';

interface Props {
  value: number;      // 0 to 1 (e.g. 0.75 = 75%)
  color?: string;     // fill colour
  height?: number;    // default 4
}

const ProgressBar = ({ value, color = colors.gold.default, height = 4 }: Props) => (
  <View style={[styles.track, { height }]}>
    <View
      style={[
        styles.fill,
        {
          width: `${Math.min(Math.max(value, 0), 1) * 100}%`,
          backgroundColor: color,
          height,
        },
      ]}
    />
  </View>
);

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: colors.border.subtle,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: { borderRadius: 2 },
});

export default ProgressBar;
```

### ScreenHeader

```tsx
// src/components/common/ScreenHeader.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { colors, spacing, typography } from '../../theme';

interface Props {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
}

const ScreenHeader = ({ title, showBack, onBack, rightElement }: Props) => (
  <View style={styles.container}>
    {showBack ? (
      <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Icon name="arrow-left" size={20} color={colors.gold.default} />
      </TouchableOpacity>
    ) : (
      <View style={styles.backPlaceholder} />
    )}
    <Text style={styles.title} numberOfLines={1}>{title}</Text>
    <View style={styles.right}>
      {rightElement ?? null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  backBtn:          { padding: 2 },
  backPlaceholder:  { width: 24 },
  title: {
    flex: 1,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  right: { minWidth: 24, alignItems: 'flex-end' },
});

export default ScreenHeader;
```

### EmptyState

```tsx
// src/components/common/EmptyState.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import GoldButton from './GoldButton';

interface Props {
  icon: string;       // emoji — e.g. "📋"
  title: string;      // "No members yet"
  message: string;    // "Add your first member to get started."
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState = ({ icon, title, message, actionLabel, onAction }: Props) => (
  <View style={styles.container}>
    <Text style={styles.icon}>{icon}</Text>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.message}>{message}</Text>
    {actionLabel && onAction && (
      <GoldButton label={actionLabel} onPress={onAction} />
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
    gap: spacing.md,
  },
  icon:    { fontSize: 44 },
  title:   { fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: colors.text.primary, textAlign: 'center' },
  message: { fontSize: typography.size.base, color: colors.text.secondary, textAlign: 'center', lineHeight: 20 },
});

export default EmptyState;
```

### LoadingSpinner

```tsx
// src/components/common/LoadingSpinner.tsx

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../../theme';

const LoadingSpinner = () => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color={colors.gold.default} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.secondary,
  },
});

export default LoadingSpinner;
```

---

## 13. Screens

For each screen: the file path, the complete layout tree, what data it needs, what every interactive element does, and what edge cases to handle.

---

### Screen 01 — Splash

**File:** `src/screens/auth/SplashScreen.tsx`

**Purpose:** Brand entry point. No data loading. One action.

**Layout (build exactly this):**
```
SafeAreaView (flex:1, bg: colors.bg.primary)
└── View (flex:1, alignItems:'center', justifyContent:'center')
    ├── View (logo outer: 88×88, rounded, bg: colors.bg.card, border: colors.border.subtle)
    │   └── View (logo inner: 70×70, rounded, bg: colors.bg.elevated, border: colors.gold.dark)
    │       └── Text "T" (40px, black weight, color: colors.gold.light)
    ├── Text "TIWANI" (28px, black weight, color: text.primary, letterSpacing: 5, marginTop: 24)
    ├── Text "Your community, together." (13px, color: text.secondary, letterSpacing: 1, marginTop: 8)
    ├── GoldButton label="Get Started" fullWidth (marginTop: 52)
    └── Text "v2.1.0 · Membership Platform" (10px, color: text.tertiary, marginTop: 16)
```

**Action:**
```tsx
<GoldButton
  label="Get Started"
  onPress={() => navigation.navigate('Login')}
  fullWidth
/>
```

**Edge cases:** None. This screen has no data dependencies.

---

### Screen 02 — Login

**File:** `src/screens/auth/LoginScreen.tsx`

**Purpose:** Authenticate the user. Three paths: email/password, phone OTP, request to join.

**Layout:**
```
SafeAreaView (bg: colors.bg.secondary)
└── ScrollView (padding: spacing.xl)
    ├── Text "Welcome back" (heading)
    ├── Text "Sign in to your Tiwani account" (subtitle)
    ├── TextInput (Email — keyboard: email-address)
    ├── TextInput (Password — secureTextEntry: true)
    ├── Text "Forgot password?" (right-aligned, color: gold, pressable)
    ├── GoldButton "Sign In" (fullWidth)
    ├── OR divider (line + "or" + line)
    ├── OutlineButton "Sign in with Phone OTP" (fullWidth)
    └── Text "Not a member? Request to Join" (centre, link in gold)
```

**Form — use React Hook Form:**

```tsx
const { control, handleSubmit, formState: { errors } } = useForm<{
  email: string;
  password: string;
}>();

// Validation rules:
// email:    required, must match /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// password: required, minLength 6
```

**Sign In action:**

```tsx
const onSubmit = async ({ email, password }: FormValues) => {
  try {
    setSubmitting(true);
    await signIn(email, password);
    // RootNavigator handles redirect automatically — no navigate() call needed here
  } catch (err: any) {
    // Map Firebase error codes to friendly messages
    const errorMap: Record<string, string> = {
      'auth/user-not-found':    'No account found with this email.',
      'auth/wrong-password':    'Incorrect password.',
      'auth/too-many-requests': 'Too many attempts. Try again later.',
      'auth/invalid-email':     'Please enter a valid email address.',
    };
    setLoginError(errorMap[err.code] ?? 'Something went wrong. Please try again.');
  } finally {
    setSubmitting(false);
  }
};
```

**Error display:** Show `loginError` as a red text below the password field. Show individual field errors (from React Hook Form) below their respective inputs.

**Forgot password action:**
```tsx
const handleForgotPassword = () => {
  Alert.prompt(
    'Reset Password',
    'Enter your email address and we will send you a reset link.',
    async (email) => {
      await sendPasswordReset(email);
      Alert.alert('Check your email', 'A password reset link has been sent.');
    }
  );
};
```

**Input styling — apply to all text inputs in the app:**
```tsx
const inputStyle = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  input: {
    padding: spacing.md,
    backgroundColor: colors.bg.tertiary,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    borderRadius: 10,
    fontSize: typography.size.base,
    color: colors.text.primary,
  },
  inputFocused: {
    borderColor: colors.gold.default,
  },
  errorText: {
    fontSize: typography.size.xs,
    color: colors.status.error,
    marginTop: spacing.xs,
  },
});
```

---

### Screen 03 — Dashboard

**File:** `src/screens/DashboardScreen.tsx`

**Purpose:** Command centre for admins; overview for members.

**Data to fetch:**
- Current user from `useAuthStore()`
- 2 upcoming events via `useEvents()` hook
- Last 3 notifications via `useNotifications()` hook
- If admin: member count, collected amount (from service functions)

**Layout sections (top to bottom):**

```
1. Greeting row
   ├── "Good morning," (small, secondary)
   ├── [first name from user.fullName] (large, primary, bold)
   └── Notification bell icon → navigate to Notifications
       └── Red dot if unread count > 0

2. Stat tiles — 2×2 grid
   Admin sees: Members count | Events count | Collected ₦ | Overdue count
   Member sees: Events count | My Status (green/red pill) | [2 tiles hidden]

3. Quick Actions — 4 tiles in a row
   Admin:  Add Member | New Event | New Poll | Record Pay
   Member: Events     | Vote      | My Ledger | Marketplace

4. "UPCOMING" label + 2 event cards
   → Each card taps to Event Detail

5. "RECENT ACTIVITY" label + 3 notification rows
   → Each row: colour dot + text + timestamp
```

**Stat tile component:**
```tsx
interface StatTileProps {
  value: string;     // "28", "₦156k", "3"
  label: string;     // "Members", "Collected", "Overdue"
  subLabel: string;  // "2 pending", "Q2 2025", "members"
  accentColor: string;
}
```

**Quick action tile component:**
```tsx
interface QuickActionProps {
  label: string;
  icon: string;     // Feather icon name
  onPress: () => void;
}
```

**Notification bell with badge:**
```tsx
<TouchableOpacity
  onPress={() => navigation.navigate('Notifications')}
  style={styles.bellButton}
>
  <Icon name="bell" size={18} color={colors.text.secondary} />
  {unreadCount > 0 && (
    <View style={styles.badge}>
      {/* red dot — no number needed */}
    </View>
  )}
</TouchableOpacity>
```

---

### Screen 04 — Members List

**File:** `src/screens/members/MembersListScreen.tsx`

**Admin only.** On mount, check `isAdmin(user)`. If false: navigate to Dashboard immediately.

```tsx
useEffect(() => {
  if (user && !isAdmin(user)) {
    navigation.replace('Dashboard');
  }
}, [user]);
```

**Data:** Use `useMembers()` hook → `{ members, loading, error }`.

**Layout:**
```
ScreenHeader title="Members" rightElement={<AddButton />} (admin only)
SearchBar (filters local array — not a Firestore query)
Filter tabs: All | Active (25) | Overdue (3)
FlatList of MemberCard components
```

**Search — filter the already-loaded list:**
```tsx
const { members } = useMembersStore();
const { searchQuery, filter } = useMembersStore();

const filteredMembers = useMemo(() => {
  let result = members;

  // Apply filter tab
  if (filter === 'active')  result = result.filter(m => m.financialStatus === 'green');
  if (filter === 'overdue') result = result.filter(m => m.financialStatus === 'red');

  // Apply search
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    result = result.filter(m => m.fullName.toLowerCase().includes(q));
  }

  return result;
}, [members, filter, searchQuery]);
```

**MemberCard component:**
```tsx
// src/components/members/MemberCard.tsx
// Shows: Avatar (with status dot) | Name + Role | Overdue badge (if red) | Chevron

<TouchableOpacity onPress={() => navigation.navigate('MemberProfile', { memberId: member.uid })}>
  <Avatar initials={getInitials(member.fullName)} photoURL={member.photoURL} size={44} statusDot={member.financialStatus} />
  <Text>{member.fullName}</Text>
  <Text>{member.role}</Text>
  {member.financialStatus === 'red' && (
    <Badge label={`Owes ${formatCurrency(member.outstandingBalance)}`} color={colors.status.error} />
  )}
  <Icon name="chevron-right" />
</TouchableOpacity>
```

**Helper — getInitials:**
```typescript
// Returns "CO" from "Chukwuemeka Obi"
const getInitials = (fullName: string): string => {
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
```

**Empty state:** If filtered list is empty, show `<EmptyState icon="👥" title="No members found" message="..." />`

---

### Screen 05 — Member Profile

**File:** `src/screens/members/MemberProfileScreen.tsx`

**Data:** Fetch single member via `getMember(memberId)` where `memberId` comes from `route.params`.

**Layout:**
```
ScreenHeader showBack onBack={navigation.goBack}
Profile hero (centred):
  └── Avatar (64px, with status dot)
  └── fullName (large, bold)
  └── Role badge + "SINCE [year]" badge
  └── Status banner: green "IN GOOD STANDING" or red "DUES OVERDUE"

Tab bar: [Info] [Family] [Finance]

Tab content (scroll):
  Info tab:    Phone | Email | Address | Marital Status | Member Since
  Family tab:  Spouse card (if married) | Children list
  Finance tab: Balance banner + transaction list (admin or self only)
```

**Tab switcher state:**
```tsx
const [activeTab, setActiveTab] = useState<'info' | 'family' | 'finance'>('info');
```

**Finance tab access guard:**
```tsx
const canViewFinance = isAdmin(currentUser) || currentUser?.uid === memberId;

// In the Finance tab content:
if (!canViewFinance) {
  return <Text style={styles.restricted}>You do not have permission to view this information.</Text>;
}
```

**Status banner:**
```tsx
<View style={[styles.banner, { backgroundColor: user.financialStatus === 'green' ? colors.status.success + '18' : colors.status.error + '18' }]}>
  <View style={[styles.bannerDot, { backgroundColor: user.financialStatus === 'green' ? colors.status.success : colors.status.error }]} />
  <Text style={{ color: user.financialStatus === 'green' ? colors.status.success : colors.status.error }}>
    {user.financialStatus === 'green' ? 'IN GOOD STANDING' : 'DUES OVERDUE'}
  </Text>
</View>
```

**Family tab — defensive rendering:**
```tsx
// Only render spouse section if married AND spouseName is set
{member.maritalStatus === 'married' && member.spouseName && (
  <SpouseCard name={member.spouseName} anniversary={member.weddingAnniversary} />
)}

// Children
{member.children.length === 0
  ? <Text style={styles.empty}>No children recorded.</Text>
  : member.children.map((child, i) => <ChildRow key={i} child={child} />)
}
```

---

### Screen 06 — Events & Calendar

**File:** `src/screens/events/EventsScreen.tsx`

**Data:** `useEvents()` hook.

**Layout:**
```
ScreenHeader title="Events" rightElement={isAdmin ? <AddButton/> : null}
Month label row: "May 2025" | "Month View"
WeekStrip component (7-day tappable strip)
"UPCOMING" label
FlatList of EventCard components
```

**WeekStrip component:**

```tsx
// src/components/events/WeekStrip.tsx

import { startOfWeek, addDays, isSameDay, format } from 'date-fns';

interface Props {
  events: TiwaniEvent[];
  selectedDay: Date;
  onDayPress: (day: Date) => void;
}

// Renders 7 day columns: letter, number, gold dot if event exists
// Selected day: gold background, dark text
// Unselected: card background, primary text
// Dot: gold if event exists on that day, transparent if not
```

**Day selection — filter event list:**
```tsx
const [selectedDay, setSelectedDay] = useState<Date | null>(null);

const visibleEvents = useMemo(() => {
  if (!selectedDay) return events; // show all if no day selected
  return events.filter(e => isSameDay(e.dateTime, selectedDay));
}, [events, selectedDay]);
```

**EventCard component:**
```tsx
// src/components/events/EventCard.tsx
// Shows: category badge | title | date + time | location | RSVP count | ProgressBar

<TouchableOpacity onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}>
  <View style={[styles.card, { borderLeftColor: CATEGORY_COLORS[event.category] }]}>
    <Badge label={event.category} color={CATEGORY_COLORS[event.category]} />
    <Text>{event.title}</Text>
    <Text>{formatEventDate(event.dateTime)} · {formatEventTime(event.dateTime)}</Text>
    <Text>{event.location}</Text>
    {event.capacity > 0 && (
      <ProgressBar value={event.rsvpList.length / event.capacity} color={CATEGORY_COLORS[event.category]} />
    )}
  </View>
</TouchableOpacity>
```

**Admin — create event:** + button opens a bottom sheet or `EventFormScreen` with fields: Title, Category (picker), Date (DateTimePicker), Location, Description, Capacity. On submit, call `createEvent(formData)`.

---

### Screen 07 — Event Detail

**File:** `src/screens/events/EventDetailScreen.tsx`

**Data:** Single event via `getEvent(eventId)`, and `currentUser` from auth store.

**Layout:**
```
Header section (card bg):
  ScreenHeader showBack rightElement={<Badge category/>}
  Title (large)
  "X going" badge + "Y spots left" badge

Scroll content:
  Date & Time info card
  Location info card
  About section (full description)
  Attendees section (horizontal chip list of first names)
  RSVP button (toggles)
  [Admin only] "Open Check-in Screen" ghost button
```

**RSVP button — two states:**
```tsx
const isRsvped = event.rsvpList.includes(currentUser.uid);

<GoldButton
  label={isRsvped ? '✓ You\'re Going!' : 'RSVP to This Event'}
  onPress={handleToggleRsvp}
  fullWidth
/>
// If isRsvped: use OutlineButton instead (gold outline, transparent fill)
```

**RSVP action:**
```tsx
const handleToggleRsvp = async () => {
  try {
    await toggleRsvp(event.id, currentUser.uid);
    // The real-time listener on the event will update the UI automatically
  } catch (err) {
    Alert.alert('Error', 'Could not update your RSVP. Please try again.');
  }
};
```

**Capacity full — hide RSVP button:**
```tsx
const isFull = event.capacity > 0 && event.rsvpList.length >= event.capacity && !isRsvped;

{isFull
  ? <Text style={styles.fullText}>This event is full.</Text>
  : <GoldButton ... />
}
```

**Check-in (admin only):**
```tsx
{isAdmin(currentUser) && (
  <TouchableOpacity onPress={() => setCheckInMode(true)} style={styles.ghostButton}>
    <Text style={styles.ghostText}>Admin: Open Check-in Screen</Text>
  </TouchableOpacity>
)}

// In check-in mode: show a list of RSVPed members
// Each row: Avatar, name, checkmark if already in attendees
// Tap a row: call checkInMember(event.id, member.uid)
```

---

### Screen 08 — Voting Hub

**File:** `src/screens/voting/VotingHubScreen.tsx`

**Data:** `useVoting()` hook → open elections and open polls.

**Layout:**
```
ScreenHeader title="Vote & Polls" rightElement={isAdmin ? <AddButton/> : null}
ScrollView:
  [If election exists]
  "ACTIVE ELECTION" label
  ElectionCard (gold border, lock icon, tap → ElectionBallotScreen)

  "ACTIVE POLLS" label
  PollCard × N (tap → PollVoteScreen)

  [If nothing open]
  EmptyState "No active votes" message
```

**ElectionCard:**
```tsx
<TouchableOpacity
  onPress={() => navigation.navigate('ElectionBallot', { electionId: election.id })}
  style={[styles.electionCard, { borderColor: colors.gold.dark }]}
>
  <Text>{election.title}</Text>
  <Badge label={election.ballotType === 'secret' ? 'SECRET BALLOT' : 'OPEN BALLOT'} color={colors.gold.default} />
  <Text>{election.races.length} races · {totalCandidates} candidates</Text>
  <GoldButton label="Cast Your Vote →" onPress={...} size="sm" />
</TouchableOpacity>
```

**PollCard:**
```tsx
// Shows: title | question | top 2 options with mini result bars | vote count + "Tap to vote"
// Colour result bars with colors.gold.default
// Show percentage next to each option bar
```

**Admin — + button:** Show an `ActionSheet` with two options: "Create Poll" and "Create Election". Each opens its own form.

---

### Screen 09 — Cast Poll Vote

**File:** `src/screens/voting/PollVoteScreen.tsx`

**Route param:** `{ pollId: string }`

**On mount — two checks in sequence:**

```tsx
useEffect(() => {
  const init = async () => {
    // 1. Check financial status
    if (currentUser?.financialStatus === 'red') {
      setGated(true);
      return;
    }
    // 2. Check if already voted
    const voted = await hasCastPollVote(pollId, currentUser.uid);
    setHasVoted(voted);
    // If voted: show results immediately, skip voting UI
  };
  init();
}, []);
```

**If gated:** Render `<FinancialGate />` and return — do not render the poll.

**Layout (not yet voted):**
```
ScreenHeader title="Cast Your Vote" showBack
Poll context card: type label + vote count + question
"CHOOSE ONE OPTION" label
PollOption × N (radio select, one at a time)
GoldButton "Submit Vote" (disabled until option selected)
```

**Layout (already voted):**
```
ScreenHeader title="Cast Your Vote" showBack
Poll context card
Results bars for each option with percentages
Green confirmation banner "✓ Vote Recorded!"
```

**PollOption component — two modes:**
```tsx
interface PollOptionProps {
  option: PollOption;
  totalVotes: number;
  selected: boolean;
  showResult: boolean;   // true after voting
  onSelect: () => void;
  disabled: boolean;     // true after voting
}

// Radio circle: filled (gold) if selected, empty border if not
// Result bar: only shown when showResult === true
// Percentage: only shown when showResult === true
```

**Submit vote action:**
```tsx
const handleSubmit = async () => {
  if (!selectedOptionId) return;
  try {
    setSubmitting(true);
    await castPollVote(pollId, selectedOptionId);
    setHasVoted(true);
  } catch (err: any) {
    Alert.alert('Vote failed', err.message ?? 'Please try again.');
  } finally {
    setSubmitting(false);
  }
};
```

---

### Screen 10 — Election Ballot

**File:** `src/screens/voting/ElectionBallotScreen.tsx`

**Route param:** `{ electionId: string }`

**On mount — same two checks as Poll Vote:** financial gate check, then `hasCastElectionVote()`.

**Layout (not yet voted):**
```
ScreenHeader title="[Election Title]" showBack
Secret ballot disclaimer banner (lock icon + explanation)
For EACH race in election.races:
  "Vote for [office]" heading
  "Select one candidate" subtitle
  CandidateCard × N
GoldButton "Submit Ballot" (disabled until ALL races have a selection)
```

**Submit enabled logic:**
```tsx
const allRacesFilled = election.races.every(
  race => electionChoices[race.raceId] !== undefined
);
// Button disabled when: !allRacesFilled || submitting
```

**CandidateCard:**
```tsx
// src/components/voting/CandidateCard.tsx
// Shows: Avatar (initials) | Name + manifesto line | Radio circle
// Selected state: gold border, gold background tint, filled radio
// Tap: call setElectionChoice(raceId, candidateName) in Zustand store
```

**Submit ballot action:**
```tsx
const handleSubmitBallot = async () => {
  try {
    setSubmitting(true);
    await castElectionBallot(electionId, electionChoices);
    setVoteSubmitted(true); // replaces form with success view
    resetElectionChoices(); // clear store
  } catch (err: any) {
    Alert.alert('Ballot failed', err.message ?? 'Please try again.');
  } finally {
    setSubmitting(false);
  }
};
```

**Success view (after submission):**
```tsx
<View style={styles.successContainer}>
  <View style={styles.checkCircle}>
    <Icon name="check" size={28} color={colors.status.success} />
  </View>
  <Text style={styles.successTitle}>Ballot Submitted</Text>
  <Text style={styles.successBody}>
    Your {election.ballotType === 'secret' ? 'secret ' : ''}ballot has been recorded.
    {election.ballotType === 'secret'
      ? ' Results will be announced by the Electoral Chairman after voting closes.'
      : ' Results are visible to all members.'}
  </Text>
  <GoldButton label="Back to Voting" onPress={() => navigation.goBack()} />
</View>
```

---

### Screen 11 — Finance Admin

**File:** `src/screens/finance/FinanceAdminScreen.tsx`

**Admin only.** Redirect non-admins to `MyLedgerScreen`.

```tsx
useEffect(() => {
  if (user && !isAdmin(user)) {
    navigation.replace('MyLedger');
  }
}, [user]);
```

**Data:**
- All ledger entries (to compute totals) — from financeService
- Dues periods list
- All members with their balances (from members store)

**Layout:**
```
ScreenHeader title="Finance" rightElement={<AddChargeButton />}

Summary tiles row (3 tiles):
  Charged (total) | Collected (total) | Outstanding (total)

"DUES PERIODS" section header + "New +" link
DuesPeriodCard × N:
  Name | ₦X per member | X/Y paid | progress bar | status badge

"MEMBER LEDGER" section header
FlatList of member rows:
  Avatar (status dot) | Name | "✓ Good standing" or "⚠ Owes ₦X,XXX" | Balance
  Tap → navigate to MyLedger with that member's ID
```

**Summary tile calculations — do this in the screen, not the service:**
```tsx
const totalCharged = ledgerEntries
  .filter(e => e.type !== 'payment')
  .reduce((sum, e) => sum + e.amount, 0);

const totalCollected = ledgerEntries
  .filter(e => e.type !== 'payment' && e.paid)
  .reduce((sum, e) => sum + e.amount, 0);

const outstanding = totalCharged - totalCollected;
```

**DuesPeriodCard component:**
```tsx
// Shows: period name | amount label | "X/Y paid" | progress bar | status badge
// Progress value: paidCount / totalMembers
// Status: use Badge component with appropriate colour
```

**+ button → Create Dues Period modal:**
```tsx
// Bottom sheet with:
// - Period name (TextInput)
// - Amount per member (numeric TextInput)
// - Due date (DateTimePicker)
// - "Charge all members" toggle (default on)
// Submit → call createDuesPeriod(data)
```

---

### Screen 12 — My Ledger

**File:** `src/screens/finance/MyLedgerScreen.tsx`

**Visible to all roles.** Shows each user their own ledger. Admin can view any member's ledger by passing `memberId` in route params.

**Route params:** `{ memberId?: string }` — optional.

**Data:**
```tsx
const { user: currentUser } = useAuthStore();
const targetUid = route.params?.memberId ?? currentUser!.uid;
// Subscribe to ledger entries for targetUid
```

**Outstanding balance calculation:**
```tsx
const outstanding = ledgerEntries
  .filter(e => e.type !== 'payment' && !e.paid)
  .reduce((sum, e) => sum + e.amount, 0);
```

**Layout:**
```
ScreenHeader title="My Finances" showBack

BalanceBanner component:
  "OUTSTANDING BALANCE" label
  ₦[amount] (32px, color: red if > 0, green if 0)
  Status badge: "DUES OVERDUE" or "IN GOOD STANDING"
  [If outstanding > 0] OutlineButton "Contact Treasurer to Pay"

"TRANSACTION HISTORY" label
FlatList of LedgerRow components
```

**LedgerRow component:**
```tsx
// src/components/finance/LedgerRow.tsx
// Shows: type icon | label + date | amount + PAID/UNPAID badge

const TYPE_ICONS: Record<LedgerType, string> = {
  dues:    'file-text',
  levy:    'file-text',
  fine:    'alert-triangle',
  pledge:  'heart',
  payment: 'arrow-up',  // green colour
};

// Amount display:
// charges:  "-₦X,XXX" — default text colour
// payments: "+₦X,XXX" — colors.status.success
```

**Empty state:** `<EmptyState icon="📄" title="No transactions yet" message="Your financial history will appear here." />`

---

### Screen 13 — Notifications

**File:** `src/screens/NotificationsScreen.tsx`

**Data:** `useNotifications()` hook → list of announcements sorted by time descending.

**Layout:**
```
ScreenHeader title="Notifications" rightElement={<MarkAllReadButton />}

"NEW" section label
[Unread notifications — full opacity, coloured left border + dot]

"EARLIER" section label
[Read notifications — 65% opacity, no dot]
```

**Read state — tracked in AsyncStorage (not Firestore):**
```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'tiwani_read_notifications';

const loadReadIds = async (): Promise<string[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
};

const markAllRead = async (ids: string[]) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
};
```

**Notification type colours:**
```typescript
export const NOTIFICATION_COLORS: Record<string, string> = {
  event:       colors.status.info,       // blue
  finance:     colors.status.success,    // green
  vote:        colors.gold.default,      // gold
  general:     colors.text.secondary,    // grey
  marketplace: colors.status.purple,     // purple
};
```

**Each notification card:**
```tsx
<View style={[styles.card, { borderLeftColor: NOTIFICATION_COLORS[notif.type] }]}>
  <View style={[styles.iconBox, { backgroundColor: NOTIFICATION_COLORS[notif.type] + '22' }]}>
    <Icon name={TYPE_ICONS[notif.type]} color={NOTIFICATION_COLORS[notif.type]} size={15} />
  </View>
  <View style={styles.content}>
    <Text style={styles.title}>{notif.title}</Text>
    <Text style={styles.body}>{notif.body}</Text>
    <Text style={styles.time}>{formatRelativeTime(notif.sentAt)}</Text>
  </View>
  {!isRead && <View style={[styles.unreadDot, { backgroundColor: NOTIFICATION_COLORS[notif.type] }]} />}
</View>
```

---

### Screen 14 — Settings

**File:** `src/screens/SettingsScreen.tsx`

**Data:** `currentUser` from auth store.

**Layout:**
```
ScreenHeader title="Settings"
ScrollView:
  Profile card: Avatar | Name | Email | Role badge | "Edit" button

  "APP SETTINGS" section header
  Row: Currency → "₦ Nigerian Naira"
  Row: Timezone → "WAT (UTC+1)"

  "NOTIFICATIONS" section header
  Toggle row: Events & Meetings
  Toggle row: Finance & Dues
  Toggle row: Voting & Polls

  Links section:
  Row: Privacy Policy → open URL
  Row: Terms of Use → open URL
  Row: Help & Support → open URL
  Row: About Tiwani v2.1 → open a small modal

  Sign Out button (red, full width)
```

**Toggle component:**
```tsx
// Use React Native's built-in Switch component
<Switch
  value={currentUser.notificationPreferences.events}
  onValueChange={(val) => handleToggleNotification('events', val)}
  trackColor={{ false: colors.bg.elevated, true: colors.gold.dark }}
  thumbColor={colors.bg.secondary}
/>
```

**Toggle action — update both local store AND call service:**
```tsx
const handleToggleNotification = async (key: keyof NotificationPreferences, val: boolean) => {
  // 1. Update local store immediately for instant UI feedback
  updateCurrentUser({
    notificationPreferences: {
      ...currentUser.notificationPreferences,
      [key]: val,
    },
  });
  // 2. Persist to Firestore via service
  await updateMemberProfile(currentUser.uid, {
    [`notificationPreferences.${key}`]: val,
  });
};
```

**Edit profile sheet:**
- Open a `Modal` or `BottomSheet` with: Photo picker + Name input + Phone input + Address input
- Photo picker:
  ```tsx
  import { launchImageLibrary } from 'react-native-image-picker';

  const pickPhoto = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, async (response) => {
      if (response.assets?.[0]?.uri) {
        const uri = response.assets[0].uri;
        // Upload to Firebase Storage, get URL, update user profile
        const url = await uploadProfilePhoto(currentUser.uid, uri);
        await updateMemberProfile(currentUser.uid, { photoURL: url });
      }
    });
  };
  ```

**Sign out:**
```tsx
const handleSignOut = async () => {
  Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Sign Out',
      style: 'destructive',
      onPress: async () => {
        await signOut();
        // RootNavigator handles the redirect to Auth automatically
      },
    },
  ]);
};
```

---

### Screen 15 — Marketplace

**File:** `src/screens/MarketplaceScreen.tsx`

**Data:** `subscribeToListings()` → max 2 listings.

**Layout:**
```
ScreenHeader title="Marketplace" rightElement={<Badge "2/2 max" />} (admin only)

Tab bar: [Browse] [Manage (Admin only)]

Browse tab:
  Info banner: "Items listed by admin. Enquire directly."
  ListingCard × N (max 2)

Manage tab (admin only):
  Info banner: "Listing Limit: 2 items maximum"
  AdminListingCard × N
  AddListingButton (disabled + "Max 2 listings reached" when listings.length >= 2)
```

**Hide Manage tab for non-admins:**
```tsx
{isAdmin(currentUser) && (
  <Tab label="Manage" active={tab === 'manage'} onPress={() => setTab('manage')} />
)}
```

**ListingCard component:**
```tsx
// src/components/marketplace/ListingCard.tsx

// Shows: emoji/image | title | status badge | description | price | Enquire button

const handleEnquire = (item: Listing) => {
  // Format WhatsApp deep link
  const phone = '2348034567890'; // admin's number — fetch from settings
  const message = encodeURIComponent(
    `Hi, I'm interested in "${item.title}" listed on Tiwani for ${formatCurrency(item.price)}. Is it still available?`
  );
  const url = `whatsapp://send?phone=${phone}&text=${message}`;

  Linking.canOpenURL(url)
    .then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // WhatsApp not installed — open SMS instead
        Linking.openURL(`sms:+${phone}?body=${message}`);
      }
    });
};

// Sold item: grey price, disabled button, reduced opacity
```

**AdminListingCard component:**
```tsx
// src/components/marketplace/AdminListingCard.tsx

// Shows: title | price | status badge | short description
// Action row: Edit | Mark Sold | Delete

// Mark Sold:
const handleMarkSold = async (id: string) => {
  await updateListing(id, { status: 'sold' });
};

// Delete — always confirm first:
const handleDelete = (id: string) => {
  Alert.alert('Delete Listing', 'Are you sure?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => deleteListing(id) },
  ]);
};
```

**Add listing form:**
```tsx
// Field: Title (required, max 60 chars — show character count)
// Field: Price (required, numeric keyboard)
// Field: Description (required, max 120 chars — show character count)
// Field: Contact instruction (required — e.g. "WhatsApp 0803456789")
// Field: Image (optional — image picker)

// Character count display:
<Text style={{ color: description.length > 120 ? colors.status.error : colors.text.tertiary }}>
  {description.length}/120
</Text>

// On submit — check count first:
if (listings.length >= 2) {
  Alert.alert('Limit reached', 'Delete or mark an existing listing as sold before adding a new one.');
  return;
}
await createListing(formData);
```

---

## 14. UI Rules

These rules apply to **every** screen in the app. Do not invent exceptions.

### The 3-Tap Rule
Every primary action must be reachable in 3 taps from the home screen.
- Home → Events → RSVP button: 3 taps ✅
- Home → Voting → Cast Vote → Submit: 4 taps — the 4th tap is the submit action on the same screen, which is fine

### Touch targets
Every tappable element must be at least **48×48dp**. For small icons, use `hitSlop`:
```tsx
<TouchableOpacity hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
```

### Keyboard behaviour
All screens with text inputs must handle the keyboard. Wrap in `KeyboardAvoidingView`:
```tsx
import { KeyboardAvoidingView, Platform } from 'react-native';

<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  style={{ flex: 1 }}
>
```

### Safe area
Every screen must be wrapped in `SafeAreaView` from `react-native-safe-area-context`:
```tsx
import { SafeAreaView } from 'react-native-safe-area-context';

<SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.secondary }}>
```

### Destructive actions — always confirm
Never let a destructive action (delete, sign out, clear data) execute without an `Alert.alert` confirmation with a 'cancel' option first.

### Role-conditional UI — always gate, never crash
Always check for null before accessing role-dependent features:
```tsx
// Wrong — crashes if user is null
if (user.role === 'admin') { ... }

// Right — safe
if (isAdmin(user)) { ... }
```

### Status colours — never deviate
- Financial good standing → `colors.status.success` (#27AE60)
- Financial overdue → `colors.status.error` (#E74C3C)
- Paid → `colors.status.success`
- Unpaid / overdue → `colors.status.error`

---

## 15. Forms & Validation

Use **React Hook Form** for all forms. Here is the standard pattern.

### Standard form pattern

```tsx
import { useForm, Controller } from 'react-hook-form';

interface FormValues {
  fullName: string;
  email: string;
  phone: string;
}

const MyForm = () => {
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: { fullName: '', email: '', phone: '' },
  });

  const onSubmit = async (data: FormValues) => {
    // Call your service function here
  };

  return (
    <>
      {/* Controlled text input — use this pattern for every field */}
      <Controller
        name="email"
        control={control}
        rules={{
          required: 'Email is required.',
          pattern: {
            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: 'Please enter a valid email address.',
          },
        }}
        render={({ field: { onChange, value, onBlur } }) => (
          <>
            <Text style={inputStyles.label}>EMAIL ADDRESS</Text>
            <TextInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[inputStyles.input, errors.email && inputStyles.inputError]}
            />
            {errors.email && (
              <Text style={inputStyles.errorText}>{errors.email.message}</Text>
            )}
          </>
        )}
      />

      <GoldButton
        label={isSubmitting ? 'Saving...' : 'Save'}
        onPress={handleSubmit(onSubmit)}
        loading={isSubmitting}
        fullWidth
      />
    </>
  );
};
```

### Validators utility

```typescript
// src/utils/validators.ts

export const required = (fieldName: string) => ({
  required: `${fieldName} is required.`,
});

export const emailRules = {
  required: 'Email is required.',
  pattern: {
    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address.',
  },
};

export const phoneRules = {
  required: 'Phone number is required.',
  pattern: {
    value: /^(\+234|0)[0-9]{10}$/,
    message: 'Please enter a valid Nigerian phone number.',
  },
};

export const passwordRules = {
  required: 'Password is required.',
  minLength: {
    value: 6,
    message: 'Password must be at least 6 characters.',
  },
};
```

---

## 16. Loading, Empty & Error States

Every screen that fetches data must handle all three states. No exceptions.

### The three states — every data screen has them

```tsx
const MyScreen = () => {
  const { data, loading, error } = useMyDataHook();

  // 1. Loading
  if (loading) return <LoadingSpinner />;

  // 2. Error
  if (error) return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>Something went wrong.</Text>
      <OutlineButton label="Try Again" onPress={refetch} />
    </View>
  );

  // 3. Empty
  if (data.length === 0) return (
    <EmptyState
      icon="📋"
      title="Nothing here yet"
      message="Check back later."
    />
  );

  // 4. Data
  return <FlatList data={data} renderItem={...} />;
};
```

### Empty state messages — use these exact strings

| Screen | Empty icon | Title | Message |
|---|---|---|---|
| Members List | 👥 | No members yet | Add your first member using the + button. |
| Members List (filtered) | 🔍 | No results | No members match your current filter. |
| Events | 📅 | No upcoming events | Check back later for new events. |
| Events (day filter) | 📅 | No events this day | Select another day or view all events. |
| Voting Hub | 🗳️ | No active votes | The admin will open polls and elections here. |
| Finance (Ledger) | 📄 | No transactions | Your financial history will appear here. |
| Notifications | 🔔 | All caught up | You have no notifications. |
| Marketplace | 🏷️ | Nothing for sale | The admin hasn't listed any items yet. |

---

## 17. Testing Checklist

Go through this before submitting any screen. Check every box.

### Auth
- [ ] Splash screen renders without crash; "Get Started" navigates to Login
- [ ] Login with correct email/password → navigates to Dashboard
- [ ] Login with wrong password → shows "Incorrect password" below the field, NOT an alert
- [ ] Login with non-existent email → shows "No account found" message
- [ ] Empty email field → shows "Email is required" validation message
- [ ] Forgot password → email receives reset link
- [ ] Sign out from Settings → returns to Splash screen
- [ ] Re-open app after sign in → remains logged in

### Members
- [ ] Non-admin opening Members tab → immediately redirected to Dashboard
- [ ] Member list loads and shows all active members
- [ ] Search updates the list with every keystroke (no delay needed)
- [ ] "Active" filter shows only green-status members
- [ ] "Overdue" filter shows only red-status members
- [ ] Overdue member rows show the "Owes ₦X,XXX" badge
- [ ] Tapping a member row navigates to their profile
- [ ] Profile Info tab renders all fields without crash
- [ ] Profile Family tab: married member shows spouse card; single shows nothing
- [ ] Profile Family tab: children list renders or shows "No children recorded"
- [ ] Profile Finance tab: member can only see their own; admin can see all
- [ ] Profile Finance tab: non-authorised viewer sees permission message

### Events
- [ ] Events list loads in date order (earliest first)
- [ ] Week strip shows correct days for the current week
- [ ] Days with events have a gold dot
- [ ] Selecting a day filters the event list to that day
- [ ] Event cards show correct category badge colour
- [ ] Event progress bar fills proportionally to RSVP count
- [ ] Tapping event card navigates to Event Detail
- [ ] RSVP button toggles between "RSVP" and "✓ You're Going!"
- [ ] RSVP counter updates after toggling
- [ ] Full event (capacity reached, user not RSVPed): RSVP button hidden, "event is full" shown
- [ ] Admin sees "Open Check-in Screen" button; member does not
- [ ] Admin can create an event; it appears in list for all users

### Voting
- [ ] Red-status member opens PollVote → FinancialGate is shown, not the poll
- [ ] Red-status member opens ElectionBallot → FinancialGate is shown
- [ ] Green-status member can vote; poll options are selectable
- [ ] Submit button disabled until an option is selected
- [ ] After submitting poll vote: results bars appear with percentages
- [ ] "Vote Recorded" confirmation appears after successful poll vote
- [ ] Same user cannot vote again in the same poll (refresh and revisit to verify)
- [ ] All election races must be selected before Submit is enabled
- [ ] After submitting election ballot: success screen with checkmark appears
- [ ] Secret ballot disclaimer banner is shown for secret elections

### Finance
- [ ] Non-admin accessing Finance tab → redirected to MyLedger (their own)
- [ ] Admin Finance screen: three summary tiles calculate correct totals
- [ ] Dues period progress bars fill proportionally
- [ ] Tapping a member row in admin ledger → their ledger opens
- [ ] MyLedger balance is red if outstanding > 0, green if 0
- [ ] "Contact Treasurer" button only appears when balance > 0
- [ ] Transaction list shows correct amounts with +/- prefix
- [ ] PAID/UNPAID badges show correct state for each entry
- [ ] Admin creates dues period → appears in Dues Periods list

### Marketplace
- [ ] Browse tab shows up to 2 listings
- [ ] Available listing shows gold price and enabled "Enquire" button
- [ ] Sold listing shows grey price and disabled "Sold" button
- [ ] "Enquire" button opens WhatsApp (or SMS) with pre-filled message
- [ ] Non-admin cannot see the Manage tab
- [ ] Admin Manage tab shows Edit / Mark Sold / Delete per listing
- [ ] Delete triggers a confirmation alert before deleting
- [ ] Mark Sold updates the listing status immediately
- [ ] Add button disabled when 2 listings exist
- [ ] Add button enabled when fewer than 2 listings exist
- [ ] Description field shows character count and turns red above 120

### General
- [ ] All amounts display with ₦ symbol and correct formatting (₦5,000 not ₦5000)
- [ ] All dates display in "Sat, 10 May 2025" format (not ISO strings)
- [ ] All screens wrapped in SafeAreaView (no content behind notch or home bar)
- [ ] Keyboards don't cover input fields on any form screen
- [ ] Loading spinner appears while data is fetching
- [ ] Empty state appears when lists have no data
- [ ] Tapping outside a modal/sheet closes it
- [ ] All destructive actions (delete, sign out) have a confirmation step
- [ ] No TypeScript errors in the terminal
- [ ] No yellow warnings in the React Native console

---

## 18. Building for Release

### Run on device (development)

```bash
# iOS
npx react-native run-ios --device

# Android (with a connected USB device)
npx react-native run-android --deviceId [your-device-id]
```

### Generate Android release APK

```bash
# Step 1: Generate a signing key (do this ONCE — save the keystore file safely)
keytool -genkeypair -v -storetype PKCS12 \
  -keystore tiwani.keystore \
  -alias tiwani \
  -keyalg RSA -keysize 2048 -validity 10000

# Step 2: Add to android/gradle.properties
MYAPP_RELEASE_STORE_FILE=tiwani.keystore
MYAPP_RELEASE_KEY_ALIAS=tiwani
MYAPP_RELEASE_STORE_PASSWORD=your_store_password
MYAPP_RELEASE_KEY_PASSWORD=your_key_password

# Step 3: Build the APK
cd android && ./gradlew assembleRelease

# Output file:
# android/app/build/outputs/apk/release/app-release.apk
```

### iOS release

```bash
# In Xcode:
# 1. Set scheme to Release
# 2. Product → Archive
# 3. Distribute App → Ad Hoc (for internal testing) or App Store Connect

# Or via CLI:
npx react-native build-ios --mode Release
```

### Install APK on a test Android device (without Play Store)

```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

---

## 19. Mistakes to Avoid

**1. Never use async/await directly in useEffect.**

```tsx
// ❌ Wrong
useEffect(async () => {
  const data = await someService.getData();
}, []);

// ✅ Right
useEffect(() => {
  const load = async () => {
    const data = await someService.getData();
  };
  load();
}, []);
```

---

**2. Always clean up real-time subscriptions on unmount.**

```tsx
// ❌ Wrong — creates a memory leak
useEffect(() => {
  subscribeToEvents((events) => setEvents(events));
}, []);

// ✅ Right
useEffect(() => {
  const unsubscribe = subscribeToEvents((events) => setEvents(events));
  return () => unsubscribe();  // ← this line is mandatory
}, []);
```

---

**3. Never display a raw number as currency — always run it through formatCurrency.**

```tsx
// ❌ Wrong
<Text>₦{member.outstandingBalance}</Text>    // "₦5000"

// ✅ Right
<Text>{formatCurrency(member.outstandingBalance)}</Text>  // "₦5,000"
```

---

**4. Never display a raw Date or Timestamp — always format it.**

```tsx
// ❌ Wrong
<Text>{event.dateTime.toString()}</Text>  // "Mon May 05 2025 10:00:00..."

// ✅ Right
<Text>{formatEventDate(event.dateTime)}</Text>  // "Sat, 10 May 2025"
```

---

**5. Never hardcode a colour value — always use the theme.**

```tsx
// ❌ Wrong
<View style={{ backgroundColor: '#C9962A' }}>

// ✅ Right
import { colors } from '../../theme';
<View style={{ backgroundColor: colors.gold.default }}>
```

---

**6. Always check for null/undefined before accessing nested properties.**

```tsx
// ❌ Wrong — crashes if user is null at startup
const firstName = user.fullName.split(' ')[0];

// ✅ Right
const firstName = user?.fullName?.split(' ')[0] ?? 'there';
```

---

**7. Never allow vote submission from the client directly — always call the service function which calls a Cloud Function.**

```tsx
// ❌ Wrong — anyone can manipulate vote counts
firestore().collection('polls').doc(pollId).update({
  totalVotes: FieldValue.increment(1)
});

// ✅ Right — backend validates everything
await castPollVote(pollId, selectedOptionId);
```

---

**8. Show an error state — never let a screen sit blank or crash when data fails to load.**

```tsx
// ❌ Wrong — blank screen if error occurs
if (loading) return <LoadingSpinner />;
return <FlatList data={data} />;

// ✅ Right — always handle the error state
if (loading) return <LoadingSpinner />;
if (error) return <ErrorView message={error} onRetry={reload} />;
if (data.length === 0) return <EmptyState ... />;
return <FlatList data={data} />;
```

---

**9. Always wrap forms in KeyboardAvoidingView or the keyboard will cover inputs on iOS.**

```tsx
// ✅ Right
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  style={{ flex: 1 }}
>
  <ScrollView>
    {/* form fields */}
  </ScrollView>
</KeyboardAvoidingView>
```

---

**10. The Marketplace Add button must be disabled in the UI when 2 listings exist — do not wait for the server to reject it.**

```tsx
const canAddListing = listings.length < 2;

<GoldButton
  label={canAddListing ? 'Add New Listing' : 'Max 2 listings reached'}
  onPress={handleAddListing}
  disabled={!canAddListing}
  fullWidth
/>
```

---

## Quick Reference

```
Framework:  React Native 0.74+ · TypeScript (required)
Navigation: React Navigation v6 — Stack + Bottom Tabs
State:      Zustand (1 store per module)
Forms:      React Hook Form
Dates:      date-fns
Icons:      react-native-vector-icons / Feather set
Backend:    Call service functions only — never query Firestore directly in screens

Screens:    15 (src/screens/)
Components: src/components/
Stores:     src/store/
Hooks:      src/hooks/
Services:   src/services/ — provided by backend engineer
Theme:      src/theme/ — all colours, spacing, typography
Utils:      src/utils/ — formatCurrency, formatDate, roleGuard, validators
Types:      src/types/ — all TypeScript interfaces

Design language:
  Primary background:  #050C07  (dark green)
  Brand accent:        #C9962A  (gold)
  Success / green:     #27AE60
  Error / red:         #E74C3C
  Primary text:        #EDE7D8

3-Tap Rule: every primary action reachable in 3 taps from home
Safe Area:  every screen uses SafeAreaView
Keyboard:   every form uses KeyboardAvoidingView
Confirm:    every destructive action uses Alert.alert with cancel option
```

---

*Tiwani Frontend Engineer Guide — v1.0 · React Native · May 2025*
