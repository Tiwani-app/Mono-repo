# Tiwani Cloud Functions

This package is the trusted backend foundation for workflows that must not rely on direct mobile-client writes.

## Implemented callables

- `requestAccountDeletion`: creates or refreshes an account deletion request for the signed-in active member and writes an audit log.
- `approveJoinRequest`: lets an active admin create the Firebase Auth account, create the Tiwani member profile, approve the request, and write an audit log.
- `createMemberAccount`: lets an active admin create a Firebase Auth account and matching Tiwani member profile directly.
- `declineJoinRequest`: lets an active admin decline a pending same-organisation join request and writes an audit log.
- `suspendMember`: lets an active admin suspend another member, disables their Firebase Auth account, and writes an audit log.
- `reactivateMember`: lets an active admin reactivate another member, enables their Firebase Auth account, and writes an audit log.
- `updateMemberRole`: lets an active admin change another member's role and writes an audit log.
- `createFinancePeriod`: lets an active admin create a dues period and charge all active members.
- `createAdHocCharges`: lets an active admin create levy, fine, or pledge charges for selected same-organisation members.
- `recordPayment`: lets an active admin apply a payment to a selected open charge and recalculate the member's finance standing.
- `reversePayment`: lets an active admin reverse a payment, reopen the applied charge, and recalculate the member's finance standing.
- `recalculateMemberFinanceStanding`: lets an active admin repair a member's outstanding balance and finance status from ledger charge rows.
- `openPoll`: lets an admin or electoral chairman open a draft poll.
- `closePoll`: lets an admin or electoral chairman close an open poll.
- `castPollVote`: lets an active member cast one vote in an open poll.
- `openElection`: lets an admin or electoral chairman open a draft election.
- `closeElection`: lets an admin or electoral chairman close an open election.
- `castElectionBallot`: lets an active member cast one ballot in an open election and updates trusted tallies.
- `generateElectionResults`: lets an admin or electoral chairman materialize trusted election results.
- `publishElectionResults`: lets an admin or electoral chairman publish closed-election results.
- `registerDeviceToken`: lets an active member register a device token for backend push delivery.
- `sendAnnouncementPush`: lets an active admin save an in-app announcement and deliver it to registered org devices.
- `cleanupInvalidPushTokens`: lets an active admin remove invalidated device tokens.
- `completeAccountDeletion`: lets an active admin complete a deletion request by deleting Firebase Auth access, anonymising the member profile, and removing push tokens.

## Next backend workflows

- None before the Blaze boundary.

## Local workflow

```bash
cd functions
npm install
npm run build
npm test
```

Deployment requires the production Firebase project to be on Blaze.

## Setup Email Delivery

The member provisioning functions generate a Firebase password setup/reset link.
They also attempt backend SMTP delivery when email delivery is configured.

Copy `functions/.env.example` to the appropriate local/CI secret source and set:

```text
TIWANI_EMAIL_DELIVERY_ENABLED=true
TIWANI_EMAIL_FROM=
TIWANI_SUPPORT_EMAIL=
TIWANI_SMTP_HOST=
TIWANI_SMTP_PORT=587
TIWANI_SMTP_SECURE=false
TIWANI_SMTP_USER=
TIWANI_SMTP_PASSWORD=
```

If SMTP is not configured, the callable still returns the generated setup link
and a delivery error so an admin can handle setup manually during development.
