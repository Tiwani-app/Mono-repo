# Tiwani Cloud Functions Deployment

Last updated: June 23, 2026

Cloud Functions are the production trust boundary for privileged Tiwani
workflows. The mobile client must not be the final authority for finance,
voting, privileged member lifecycle, push delivery, or account deletion.

## Project

```text
Firebase project ID: tiwani-backend
Project number: 898397481054
Functions source: frontend/functions
```

## Local Validation

Run from `frontend/`:

```bash
npm run functions:build
npm run test:rules
npm run typecheck
npm run lint
npm test
```

## Deployment Command

Deploy from `frontend/`:

```bash
firebase deploy --only functions --project tiwani-backend
```

Deploy rules/indexes/storage with:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage --project tiwani-backend
```

Deploy hosting policy pages with:

```bash
firebase deploy --only hosting --project tiwani-backend
```

## Exported Functions

Member lifecycle:

```text
createMemberAccount
approveJoinRequest
declineJoinRequest
suspendMember
reactivateMember
updateMemberRole
syncMemberDirectoryOnUserWrite
backfillMemberDirectory
```

Finance:

```text
createFinancePeriod
createAdHocCharges
recordPayment
reversePayment
recalculateMemberFinanceStanding
```

Voting:

```text
createPoll
updatePoll
openPoll
closePoll
castPollVote
createElection
updateElection
openElection
closeElection
castElectionBallot
generateElectionResults
listElectionVoterReceipts
publishElectionResults
```

Notifications and activity:

```text
registerDeviceToken
sendAnnouncementPush
cleanupInvalidPushTokens
cleanupDisabledPushTokens
notifyEventCreated
notifyEventUpdated
notifyMarketplaceCreated
notifyMarketplaceUpdated
sendScheduledEventReminders
```

Account deletion:

```text
requestAccountDeletion
completeAccountDeletion
```

## Post-Deploy Checks

After every production deploy:

1. Open Firebase Console and confirm the deployed function list.
2. Check Functions logs for deployment/runtime errors.
3. Run a narrow production smoke test:
   - login/profile restore
   - admin dashboard
   - one member directory read
   - one event read
   - one notification read
4. For function changes, test the affected workflow with a dedicated test record.
5. Check `audit_logs` for expected backend-written entries.

## Member Directory Backfill

Use when existing `users` documents need sanitized directory mirrors:

```bash
GOOGLE_CLOUD_PROJECT=tiwani-backend node scripts/backfill-member-directory.js tiwani-org-v1
```

Expected successful output:

```text
Backfill complete. Wrote <n> member_directory document(s).
```

## Deployment Safety Rules

- Do not deploy broad function changes without `npm run functions:build`.
- Do not loosen Firestore rules to compensate for function failures.
- Do not log private member data, vote choices, push tokens, payment references,
  phone numbers, or private document titles.
- Keep function memory/min instances conservative unless monitoring proves a
  need to increase them.
- Prefer idempotent writes and audit logs for privileged mutations.
- If a production deploy breaks a critical path, pause rollout and follow
  `docs/INCIDENT_RESPONSE_CONTACTS.md`.
