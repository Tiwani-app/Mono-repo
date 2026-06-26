# Release Blockers And Gates

Last updated: June 25, 2026

This register separates code defects from external release gates. The main
launch checklist may mark `No critical or high-severity defects open` complete
when there are no documented critical/high defects from automated checks and
current QA notes. Real-device QA and TestFlight QA remain separate release
gates.

## Current Automated Verification

Passed locally on June 25, 2026:

```text
npm run typecheck
npm run lint
npm test
npm run functions:build
npm run test:rules
```

Rules-test permission-denied logs are expected negative-test output. The rules
suite passed.

## Critical Or High Code Defects

No critical or high-severity code defect is currently documented in this
register as of June 25, 2026.

This does not mean the release is approved. It means no unresolved critical/high
defect is known from the latest local automated checks and documented QA notes.

## External Release Gates

| Gate | Status | Owner/Next Action |
| --- | --- | --- |
| iOS EAS signing credentials | Blocked, confirmed June 24 | Configure Apple internal-distribution credentials with `npx eas credentials --platform ios`. |
| iOS productionCandidate build | Blocked by signing, retry failed June 24 | Run `npx eas build --platform ios --profile productionCandidate --non-interactive` after credentials exist. |
| Real-device App Check validation | Waiting on iOS build | Install physical-device build and confirm valid App Check traffic in monitoring mode. |
| Crashlytics validation | Waiting on iOS build | Confirm startup/session data and safe user attributes in Firebase Console. |
| Budget alerts | Manual console task | Configure billing budget alerts before public rollout. |
| Blaze Day 0 safety checks | Manual console task | Confirm billing owner, alert recipients, unused paid services, and Cloud Functions scaling settings. |
| Incident-response contacts | Manual owner task | Fill real primary/backup contacts in `docs/INCIDENT_RESPONSE_CONTACTS.md`. |
| Demo reviewer accounts | Manual app/admin task | Create dedicated admin, member, and electoral chairman reviewer accounts and store passwords securely. |
| Store screenshots | Waiting on release-candidate build | Capture from the exact build intended for submission. |
| TestFlight QA | Waiting on iOS build | Run `docs/RELEASE_CANDIDATE_QA_CHECKLIST.md` on TestFlight/internal build. |
| Android release-candidate build | Deferred | Product decision: skip Android EAS for now; return before Google Play testing. |

## Public URLs

Checked on June 24, 2026. All returned HTTP 200:

```text
https://tiwani-backend.web.app/privacy.html
https://tiwani-backend.web.app/terms.html
https://tiwani-backend.web.app/support.html
https://tiwani-backend.web.app/account-deletion.html
https://tiwani-backend.web.app/marketplace-rules.html
```

Owner/legal review is still required before final public submission.
