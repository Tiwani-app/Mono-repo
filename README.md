# Tiwani Frontend

Tiwani is a mobile membership management app for associations and cooperatives. This folder contains the React Native/Expo frontend, generated native projects, Firebase client integration, Firestore and Storage rules, and the Cloud Functions package used by privileged workflows.

The current app uses native React Native Firebase modules, Firebase Auth, Firestore realtime subscriptions, Firebase Storage uploads, Firebase Cloud Functions callables, and Expo dev-client/native builds.

## Current Baseline

- App version: `2.1.0`
- Runtime: Expo dev-client and native iOS/Android builds
- iOS bundle identifier: `com.tiwani.app`
- Android package: `com.tiwani.app`
- Firebase target: supplied by your own untracked Firebase platform files and `.env` (see below). No real project identifiers are committed to this repo.

Expo Go is not a supported runtime for this app because the project uses `@react-native-firebase/*` native modules. Use `npm run ios`, `npm run android`, or EAS/dev-client builds.

## Main Features

- Email/password authentication with Firebase Auth.
- Tiwani profile restore from `users/{uid}` after Auth sign-in.
- Join request submission and admin review.
- Admin member provisioning through Cloud Functions.
- Member directory, member profiles, family fields, settings, and notification preferences.
- Dashboard with role-based quick actions.
- Events, event creation/editing, RSVP, attendee lists, and check-in.
- Finance periods, dues, ad-hoc charges, payment recording, reversals, member ledgers, and standing calculation.
- Library categories for constitutional documents and meeting/report documents.
- PDF upload to Firebase Storage for library documents.
- Marketplace browsing, listing management, image support, and direct enquiry handoff.
- In-app announcements and push-notification backend hooks.
- Polls and elections with secure backend voting callables.
- Account deletion request flow.

## Tech Stack

- Expo `~55`
- React Native `0.83`
- React `19`
- TypeScript
- React Navigation
- Zustand
- React Hook Form
- date-fns
- Firebase Auth, Firestore, Functions, Messaging, and Storage through React Native Firebase
- Firebase Emulator Suite
- Jest and Firebase rules unit testing

## Project Structure

```text
frontend/
  android/                         Generated Android project
  ios/                             Generated iOS project
  functions/                       Firebase Cloud Functions package
  src/
    __tests__/                     Frontend, service, converter, navigation, and rules tests
    components/                    Shared and feature-specific UI components
    config/                        Runtime env and native Firebase module loading
    hooks/                         Feature hooks connecting screens to stores/services
    navigation/                    Auth, tab, stack, and route definitions
    screens/                       App screens grouped by feature
    services/                      Firebase service layer and converters
    store/                         Zustand stores
    theme/                         Colors, spacing, typography
    types/                         Shared TypeScript models
    utils/                         Guards, formatting, validation, and navigation helpers
  app.config.js                    Expo config with environment-aware native identity
  eas.json                         EAS build profiles
  firebase.json                    Firebase rules/functions/emulator config
  firestore.rules                  Firestore security rules
  firestore.indexes.json           Firestore composite indexes
  storage.rules                    Firebase Storage security rules
```

## Prerequisites

Install these before working on the app:

- Node.js `18` or newer
- npm
- Xcode and iOS Simulator for iOS builds
- Android Studio and an emulator/device for Android builds
- Java (required by the Firebase Emulator Suite)
- Firebase CLI, installed through `firebase-tools`
- EAS CLI if building remotely with EAS

Install dependencies:

```bash
npm install
```

Install Functions dependencies when working on backend callables:

```bash
npm --prefix functions install
```

## Environment Configuration

Start from `.env.example`:

```bash
cp .env.example .env
```

Important variables:

```text
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_APP_VERSION=2.1.0
EXPO_PUBLIC_DEFAULT_ORG_ID=<your-org-id>
EXPO_PUBLIC_USE_FIREBASE_EMULATORS=false
EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=127.0.0.1
EXPO_PUBLIC_DEV_LOGIN_EMAIL=
EXPO_PUBLIC_DEV_LOGIN_PASSWORD=
EXPO_PUBLIC_FINANCE_CONTACT_EMAIL=
EXPO_PUBLIC_SUPPORT_URL=
EXPO_PUBLIC_PRIVACY_POLICY_URL=
EXPO_PUBLIC_TERMS_URL=
EXPO_PUBLIC_ACCOUNT_DELETION_URL=
```

Native identity/build overrides:

```text
TIWANI_APP_NAME=
TIWANI_APP_VERSION=
TIWANI_IOS_BUNDLE_IDENTIFIER=
TIWANI_ANDROID_PACKAGE=
TIWANI_IOS_GOOGLE_SERVICES_FILE=
TIWANI_ANDROID_GOOGLE_SERVICES_FILE=
TIWANI_IOS_APS_ENVIRONMENT=
```

Android release signing values must come from your shell, CI, or EAS secrets. Do not commit real signing values:

```text
TIWANI_UPLOAD_STORE_FILE=
TIWANI_UPLOAD_STORE_PASSWORD=
TIWANI_UPLOAD_KEY_ALIAS=
TIWANI_UPLOAD_KEY_PASSWORD=
```

Production builds clear `EXPO_PUBLIC_DEV_LOGIN_EMAIL` and `EXPO_PUBLIC_DEV_LOGIN_PASSWORD` automatically through `src/config/env.ts`.

## Firebase Native Files

The app uses native Firebase platform configuration files:

```text
ios/Tiwani/GoogleService-Info.plist
android/app/google-services.json
```

These files are intentionally gitignored and are not part of this repo. To run the app against a real backend you need your own Firebase project with iOS/Android apps registered under matching bundle/package identifiers.

To set up or change Firebase projects:

1. Download your project's `GoogleService-Info.plist` and `google-services.json` from Firebase Console.
2. Place them at the paths above, or set `TIWANI_IOS_GOOGLE_SERVICES_FILE` and `TIWANI_ANDROID_GOOGLE_SERVICES_FILE`.
3. Confirm `app.config.js` bundle/package values match the Firebase apps.
4. Rebuild the native app. Metro reload alone is not enough after native Firebase file changes.

## Running The App

Start Metro for the dev client:

```bash
npm start
```

Run iOS:

```bash
npm run ios
```

Run Android:

```bash
npm run android
```

If Firebase native files, bundle identifiers, Android package names, entitlements, or native dependencies change, rebuild the native app instead of only refreshing Metro.

## Firebase Auth And Profile Requirements

Firebase Auth and Firestore profiles are separate. A successful Firebase Auth sign-in is not enough to enter the Tiwani app. The app then loads:

```text
users/{firebaseAuthUid}
```

Every Firebase Auth user who should use Tiwani must have a matching Firestore profile document whose document id is exactly the Auth UID.

Minimum profile shape:

```ts
{
  uid: "same-as-document-id",
  orgId: "<your-org-id>",
  fullName: "Member Name",
  email: "member@example.com",
  role: "admin" | "electoral_chairman" | "member",
  status: "active" | "inactive" | "suspended" | "pending",
  financialStatus: "green" | "red",
  outstandingBalance: 0,
  maritalStatus: "single" | "married" | "divorced" | "widowed",
  memberSince: "2026-01-01",
  notificationPreferences: {
    events: true,
    finance: true,
    voting: true
  }
}
```

Optional profile fields supported by the app:

```ts
{
  phone: "",
  address: "",
  photoURL: null,
  dateOfBirth: "",
  spouseName: null,
  spouseDateOfBirth: null,
  weddingAnniversary: null,
  children: []
}
```

Important rules:

- Do not manually create Auth users without matching Firestore profiles.
- Do not manually create Firestore profiles without matching Auth users.
- `orgId` is required for organisation-scoped reads and writes.
- `status` must be `active` for normal app access.
- Admin provisioning through Cloud Functions is the intended production path.

## Firestore Collections

Current top-level collections:

```text
organisations
users
member_directory
join_requests
account_deletion_requests
events
finance_periods
finance
library_documents
marketplace
announcements
device_tokens
polls
elections
```

Current subcollections:

```text
users/{userId}/attendance/{eventId}
polls/{pollId}/votes/{userId}
elections/{electionId}/voterRegistry/{userId}
```

Every organisation-owned document should carry `orgId`.

## Data Status Values

Keep persisted status values aligned with the frontend converters.

Event statuses:

```text
draft
published
cancelled
completed
```

Unsupported status values fail fast with a converter validation error. Clean source data to the canonical values above.

Poll and election statuses:

```text
draft
open
closed
```

Library document statuses:

```text
draft
published
archived
```

Marketplace statuses:

```text
available
reserved
sold
archived
```

Finance paid statuses:

```text
unpaid
partial
paid
reversed
```

## Storage Paths

Library PDFs:

```text
organisations/{orgId}/library/{documentId}/{fileName}
```

Profile images:

```text
organisations/{orgId}/profiles/{userId}/{fileName}
```

Marketplace images:

```text
organisations/{orgId}/marketplace/{listingId}/{fileName}
```

Storage rules currently enforce:

- Library uploads must be PDFs.
- Library PDFs must be 20 MB or smaller.
- Images must use an image content type.
- Images must be 5 MB or smaller.
- Access is organisation-scoped.

## Developer Commands

Run type checking:

```bash
npm run typecheck
```

Run lint:

```bash
npm run lint
```

Run all Jest tests:

```bash
npm test
```

Run Firestore rules config tests:

```bash
npm run test:rules:config
```

Run Firestore Emulator Suite rules tests:

```bash
npm run test:rules:emulator
```

Run both rules checks:

```bash
npm run test:rules
```

Build Cloud Functions:

```bash
npm run functions:build
```

Build functions directly:

```bash
npm --prefix functions run build
```

Run function tests:

```bash
npm --prefix functions test
```

## Firebase Emulator Suite

The Firebase config includes local emulators:

```text
Auth:      9099
Firestore:8080
Functions:5001
Storage:  9199
UI:       4000
```

To point the mobile app at emulators, set:

```text
EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true
EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=127.0.0.1
```

For iOS Simulator, `127.0.0.1` is usually correct. For Android emulator, you may need:

```text
EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=10.0.2.2
```

Then rebuild/restart the app as needed.

Start emulators manually:

```bash
firebase emulators:start
```

Run rules tests through the configured script:

```bash
npm run test:rules:emulator
```

## Firestore And Storage Rules Deployment

Deploy Firestore rules only:

```bash
npx firebase deploy --only firestore:rules --project <your-project-id>
```

Deploy Firestore indexes only:

```bash
npx firebase deploy --only firestore:indexes --project <your-project-id>
```

Deploy Storage rules only:

```bash
npx firebase deploy --only storage --project <your-project-id>
```

Deploy rules and indexes together:

```bash
npx firebase deploy --only firestore,storage --project <your-project-id>
```

Always run rules tests before deploying rules:

```bash
npm run test:rules
```

## Cloud Functions

Cloud Functions live in:

```text
functions/
```

Implemented callable groups:

- Account deletion: `requestAccountDeletion`, `completeAccountDeletion`
- Join requests: `approveJoinRequest`, `declineJoinRequest`
- Members: `createMemberAccount`, `suspendMember`, `reactivateMember`, `updateMemberRole`
- Finance: `createFinancePeriod`, `createAdHocCharges`, `recordPayment`, `reversePayment`, `recalculateMemberFinanceStanding`
- Voting: `openPoll`, `closePoll`, `castPollVote`, `openElection`, `closeElection`, `castElectionBallot`, `generateElectionResults`, `publishElectionResults`
- Notifications: `registerDeviceToken`, `sendAnnouncementPush`, `cleanupInvalidPushTokens`

Build functions:

```bash
npm --prefix functions run build
```

Run the functions emulator:

```bash
npm --prefix functions run serve
```

Deploy functions:

```bash
npm --prefix functions run deploy
```

Or deploy from the frontend folder:

```bash
npx firebase deploy --only functions --project <your-project-id>
```

Production note: deployed Cloud Functions require Firebase Blaze. The frontend keeps voting, member provisioning, finance authority, push delivery, and account deletion completion as backend-backed flows.

## Feature Notes

### Auth

- The app signs in with Firebase Auth.
- It then restores the Tiwani profile from Firestore.
- If the Auth user exists but the Firestore profile is missing, the app signs out and shows a profile-provisioning message.
- If `orgId` is missing, organisation-scoped access will fail.
- Password reset uses Firebase Auth email templates.

### Dashboard

- Admin dashboard shows member, event, collection, and overdue summaries.
- Admin quick actions include Add Member, New Event, New Poll, Record Pay, Library, and Upload Doc.
- Member quick actions include Events, Vote, My Ledger, Marketplace, and Library.

### Members

- Admin member creation and join approval are intended to call backend functions so Auth and Firestore stay in sync.
- Members can maintain safe profile fields and notification preferences.
- Role, status, and finance changes are privileged.

### Events

- Events are organisation-scoped.
- Members can RSVP to published events.
- Admins can create/edit/cancel events and check in attendees.
- Event statuses must use canonical values; the converter rejects anything else.

### Finance

- Dues periods, ad-hoc charges, payments, reversals, and recalculation are backend-authoritative.
- Member finance state is derived from ledger entries and standing helpers.
- Do not make final finance writes directly from untrusted clients in production.

### Library

- Admins can upload PDFs and metadata.
- Documents are organised into constitutional documents and meeting/report documents.
- Storage rules limit PDFs to 20 MB.

### Marketplace

- Members and admins can create listings.
- Listings support member/admin enquiry flows.
- Marketplace images use URL or Storage-backed file paths depending on the form data.

### Voting

- Poll and election creation screens exist in the app.
- Opening, closing, voting, ballot casting, and results should be handled by Cloud Functions.
- Members with blocked finance standing can be gated from voting by frontend and backend checks.

### Notifications

- In-app announcements are stored in Firestore.
- Push notification sending and device-token registration are Cloud Function-backed.
- Notification preferences are stored on the user profile.

## Build Profiles

EAS profiles are defined in `eas.json`:

```text
development: dev client, internal distribution
staging: internal distribution, EXPO_PUBLIC_APP_ENV=staging
production: store-ready profile, EXPO_PUBLIC_APP_ENV=production
```

Build with EAS:

```bash
eas build --platform ios --profile development
eas build --platform ios --profile staging
eas build --platform ios --profile production
eas build --platform android --profile development
eas build --platform android --profile staging
eas build --platform android --profile production
```

Local native builds:

```bash
npm run ios
npm run android
```

## Production Readiness Checklist

Before public release:

- Confirm final bundle identifier and Android package.
- Confirm Firebase apps match native bundle/package values.
- Separate development, staging, and production Firebase projects.
- Enable Blaze where Cloud Functions are deployed.
- Add billing budgets and alerts before production function deployment.
- Deploy and validate Cloud Functions in staging first.
- Deploy Firestore rules, indexes, and Storage rules.
- Run rules tests and app tests.
- Configure APNs/FCM for push notifications.
- Configure branded Firebase Auth email templates and authorized domains.
- Configure App Check in monitoring mode, then enforce after validation.
- Add Crashlytics or equivalent production crash monitoring.
- Publish Privacy Policy, Terms, Support, and Account Deletion URLs.
- Configure iOS signing and Android upload signing.
- Run real-device QA, not only simulator QA.
- Prepare admin/member reviewer accounts for App Store and Play review.


## Troubleshooting

### "Firebase native modules are unavailable"

The app is running in the wrong runtime. Use an Expo development build or native build, not Expo Go.

### Firebase Authentication says signed in, but the app returns to login

Firebase Auth accepted the credentials, but the Tiwani Firestore profile failed to restore. Check:

- A document exists at `users/{Auth UID}`.
- The document id matches the Auth UID exactly.
- The document has `uid`, `orgId`, `fullName`, `email`, `role`, `status`, `financialStatus`, `maritalStatus`, and `memberSince`.
- `status` is `active`.
- Firestore rules have been deployed to the project the app is using.

### "Your Tiwani member profile is missing an organisation"

Add the correct `orgId` field to the user profile. It must match an existing document in `organisations`.

### "permission-denied"

Check:

- The app is pointed at the intended Firebase project.
- Firestore or Storage rules were deployed to that same project.
- The signed-in user has a valid `users/{uid}` profile.
- The target document has the same `orgId` as the user.
- The user role is allowed to perform the action.

### Event screen says "Field status has an unsupported value"

Clean the event document status to one of:

```text
draft
published
cancelled
completed
```

The converter fails fast on any other value; correct the document in Firestore.

### Library upload fails

Check:

- The signed-in user is an active admin.
- The file is a PDF.
- The file is 20 MB or smaller.
- Storage rules were deployed.
- The Storage path uses the correct organisation id.

### Voting or member creation fails on Spark

Those workflows are essential and intentionally kept in the app, but secure production execution relies on Cloud Functions. Deployed Cloud Functions require Blaze. Use the Functions emulator locally or deploy to a Blaze-backed Firebase project.

### Native config changed but app still points at old Firebase project

Rebuild the native app. Metro reload will not replace native Firebase configuration files.

## Coding Guidelines

- Keep screens focused on presentation and navigation.
- Put Firebase reads/writes in `src/services`.
- Put Firestore conversion and validation in `src/services/converters`.
- Put derived state and role/business rules in `src/utils`.
- Reuse existing components and theme tokens before adding new UI patterns.
- Do not bypass Cloud Functions for privileged production workflows.
- Do not loosen Firestore or Storage rules to fix a frontend bug.
- Add focused tests when changing converters, guards, navigation, rules, or service contracts.
- Keep data contracts explicit. If a field is required for app correctness, validate it clearly.

## Verification Before Handoff

Run these before handing off any meaningful frontend change:

```bash
npm run typecheck
npm run lint
npm test
```

For security-rule or Firebase access changes, also run:

```bash
npm run test:rules
```

For Cloud Function changes, also run:

```bash
npm --prefix functions run build
npm --prefix functions test
```

## Related Documents

- `firestore.rules`
- `storage.rules`
- `firestore.indexes.json`
- `functions/README.md`
