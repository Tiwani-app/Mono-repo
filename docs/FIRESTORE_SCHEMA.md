# Tiwani Firestore Schema

Last updated: June 23, 2026

This document describes the production data model used by the mobile app,
Firestore rules, and Cloud Functions. Keep schema changes small before launch.

## Production Project

```text
Firebase project ID: tiwani-backend
Project number: 898397481054
Default organisation ID: tiwani-org-v1
```

## Top-Level Collections

| Collection | Purpose | Primary Writers | Primary Readers |
| --- | --- | --- | --- |
| `organisations` | Organisation profile, finance contact, app-level settings. | Admin/backend | Signed-in same-org users |
| `users` | Private authoritative member profiles. | Backend/admin/self-safe fields | Own user, admins |
| `member_directory` | Sanitized member-facing profile mirror. | Backend trigger/backfill | Active same-org users |
| `join_requests` | Public membership applications and review state. | Applicant/admin/backend | Admins, request owner where allowed |
| `account_deletion_requests` | Member account deletion requests. | Requesting user/backend | Requesting user, admins/backend |
| `events` | Event records, RSVP metadata, attendance context. | Admins | Active same-org users for published events |
| `finance_periods` | Dues period banners and period-level state. | Finance Cloud Functions | Admins, members where relevant |
| `finance` | Charges, dues, payments, reversals, and ledger rows. | Finance Cloud Functions | Admins, owner member |
| `library_documents` | Library document metadata. | Admins | Members for published visible docs |
| `marketplace` | Marketplace listings. | Signed-in same-org users/admins | Active same-org users |
| `announcements` | In-app notifications/announcements. | Admin/backend | Targeted same-org users |
| `audit_logs` | Privileged mutation audit trail. | Backend only | Admins |
| `device_tokens` | FCM device tokens and invalidation state. | Backend only | Backend only |
| `polls` | Poll metadata, options, status, expiry. | Voting Cloud Functions | Active same-org users |
| `elections` | Election metadata, races, candidates, status, expiry. | Voting Cloud Functions | Active same-org users |
| `election_results` | Generated election totals/results. | Voting Cloud Functions | Role-gated views |
| `event_reminder_jobs` | Scheduled event reminder idempotency markers. | Backend only | Backend only |

## Subcollections

| Path | Purpose |
| --- | --- |
| `users/{userId}/attendance/{eventId}` | Event RSVP/check-in record for a member. |
| `polls/{pollId}/votes/{userId}` | Poll vote receipt/participation record. |
| `elections/{electionId}/voterRegistry/{userId}` | Secret-ballot participation receipt. Must not expose choices. |

## Private User Profile: `users/{uid}`

Authoritative profile document. Document ID must equal Firebase Auth UID.

Important fields:

```text
uid
orgId
fullName
email
phone
photoURL
role: admin | electoral_chairman | member
status: active | inactive | suspended | pending
financialStatus: green | red
outstandingBalance
joinedAt
address
maritalStatus
dateOfBirth
spouseName
spouseDateOfBirth
weddingAnniversary
children[]
notificationPreferences
```

Rules:

- Members may read/update only safe own profile fields.
- Members must not update role, status, finance status, or balance.
- Member-facing directory screens must use `member_directory`, not private
  `users/{otherUid}`.

## Sanitized Directory: `member_directory/{uid}`

Generated from `users/{uid}` by backend trigger/backfill.

Allowed fields:

```text
uid
orgId
fullName
email
phone
photoURL
role
status
memberSince
maritalStatus
dateOfBirth
spouseName
spouseDateOfBirth
weddingAnniversary
children[]
```

Forbidden fields:

```text
financialStatus
outstandingBalance
address
notificationPreferences
payment references
private finance metadata
```

## Finance Records

`finance_periods/{periodId}` stores dues-period metadata such as title, amount,
due date, created-by fields, member count, and paid count.

`finance/{entryId}` stores both charges and payments. Payments should link to a
selected charge where possible so member ledgers can be reconciled without
manual guessing.

Important charge/payment fields:

```text
orgId
memberId
type: dues | levy | fine | pledge | payment
amount
amountPaid
paidStatus: unpaid | partial | paid
dueDate
description
reference
duesPeriodId
linkedChargeId
recordedBy
recordedByName
recordedByEmail
recordedByPhone
createdAt
updatedAt
```

Rules:

- Authoritative finance writes go through Cloud Functions.
- Members can read their own ledger only.
- Admins can read same-org finance records.
- Reversals create compensating records/audit trail rather than silent deletion.

## Voting Records

`polls/{pollId}` contains poll metadata, options, status, expiry, totals, and
organisation ownership.

`elections/{electionId}` contains election metadata, race/candidate lists,
status, expiry, secret-ballot flag, and organisation ownership.

Rules:

- Creation/edit/open/close/vote/cast actions go through Cloud Functions.
- Expired polls/elections remain readable for reference.
- Secret ballot voter receipts may show participation but not vote choices.

## Library And Storage

`library_documents/{documentId}` stores metadata for uploaded library files.

Storage path:

```text
organisations/{orgId}/library/{documentId}/{filename}
```

Rules:

- Admins manage uploads.
- Member-visible docs must be published and not admin-only.
- Storage rules enforce PDF-only uploads and max size from rules.

## Notifications

`announcements/{id}` stores in-app announcements and activity notifications.
Read/unread state is user-specific; do not store one shared global read state.

`device_tokens/{tokenDocId}` stores push tokens, platform, owner UID, org ID,
and disabled/invalidation state. Backend manages token cleanup.

## Audit Logs

`audit_logs/{id}` records privileged mutations:

- member lifecycle
- join requests
- finance mutations
- voting state changes
- notifications
- account deletion

Audit logs are backend-written and admin-readable only.

## Required Maintenance

- Run `npm run test:rules` before release.
- Keep `firestore.indexes.json` aligned with queries.
- Run `GOOGLE_CLOUD_PROJECT=tiwani-backend node scripts/backfill-member-directory.js tiwani-org-v1` after member-directory trigger changes.
- Avoid schema changes after release-candidate QA unless they fix a release blocker.
