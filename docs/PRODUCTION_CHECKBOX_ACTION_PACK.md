# Production Checkbox Action Pack

Last updated: June 25, 2026

Use this file to finish the remaining release-candidate checkboxes quickly.
Each item lists the fastest safe way to complete and verify the checkbox.

## Can Be Completed In Firebase/Google Cloud Console

### Budget Alerts Configured

Firebase/Google Cloud Console:

1. Open Billing for project `tiwani-backend`.
2. Confirm the billing account is the intended Tiwani billing account.
3. Create three budget alerts:
   - early warning,
   - expected monthly ceiling,
   - emergency investigation threshold.
4. Add at least two recipients.
5. Record names/amounts/recipients in `docs/FIREBASE_PRODUCTION_CONSOLE_CHECKLIST.md`.

After evidence is recorded, tick:

```text
[ ] Budget alerts configured
```

### Blaze Day 0 Safety Checks Complete

Verify:

1. `tiwani-backend` is on Blaze.
2. Billing account owner is known.
3. At least two people receive budget alerts.
4. Unused paid services are not enabled unless intentionally approved.
5. Cloud Functions do not have accidental elevated `minInstances`.
6. No service-account keys are stored in the app repo, chat, or mobile config.

Already verified from repo/CLI:

- Cloud Functions do not show elevated `minInstances`.
- Firebase Admin SDK imports are confined to `functions/src`.
- Mobile Firebase files are project identifiers, not service-account keys.

After remaining console evidence is recorded, tick:

```text
[ ] Blaze Day 0 safety checks complete
```

### App Check Tested And Enforced

Do not enforce from simulator-only testing.

1. Register iOS app `com.tiwani.app` in Firebase App Check.
2. Select App Attest with DeviceCheck fallback.
3. Build and install a physical-device iOS `productionCandidate`.
4. Confirm valid requests in App Check monitoring mode.
5. Enforce App Check for:
   - Cloud Firestore,
   - Cloud Storage,
   - Cloud Functions.
6. Smoke test login, events, voting, finance, library, marketplace, notifications.

After enforcement and smoke tests pass, tick:

```text
[ ] App Check tested and enforced
```

### Crash Reporting Active

Requires a physical-device release-candidate build.

1. Confirm Crashlytics is enabled in Firebase Console.
2. Install iOS `productionCandidate`.
3. Confirm startup/session data appears in Crashlytics.
4. Confirm attributes only use safe identifiers, such as uid/role.
5. Do not add a permanent crash-test button to the release build.

After evidence is recorded, tick:

```text
[ ] Crash reporting active
```

### Monitoring Dashboard Active

Create saved views or a routine dashboard/checklist for:

- Crashlytics crashes and non-fatal errors.
- Cloud Functions errors and scheduled job failures.
- Firestore denied requests and usage spikes.
- Storage upload/download failures.
- FCM invalid tokens and send failures.
- App Check denied/unknown clients.
- Billing usage and budget alerts.

After an owner is assigned and views/routine are recorded, tick:

```text
[ ] Monitoring dashboard active
```

## Requires Apple Developer / EAS Credentials

### iOS Production Signing Complete

Run locally from `frontend/`:

```bash
npx eas credentials --platform ios
```

Choose:

```text
productionCandidate
Build Credentials
All: set up all required credentials
```

Use the Apple Developer account that owns `com.tiwani.app`, or provide a
prepared `credentials.json`. Do not paste Apple credentials into chat.

After credentials exist, run:

```bash
npx eas build --platform ios --profile productionCandidate --non-interactive
```

After the build queues/completes, tick:

```text
[ ] iOS production signing complete
```

## Requires Real Device / TestFlight

### Real-Device QA Complete

Install the iOS `productionCandidate` on a physical iPhone and run:

```text
docs/RELEASE_CANDIDATE_QA_CHECKLIST.md
```

Use admin, member, overdue member, electoral chairman, and pending applicant
test accounts.

After all critical flows pass, tick:

```text
[ ] Real-device QA complete
```

### TestFlight QA Complete

After App Store Connect/TestFlight receives the build:

1. Install through TestFlight.
2. Repeat the release-candidate QA checklist.
3. Confirm push notifications, App Check, and Crashlytics still work.

After passing TestFlight QA, tick:

```text
[ ] TestFlight QA complete
```

### Store Screenshots Approved

Capture screenshots from the exact release-candidate/TestFlight build, not
debug simulator overlays.

Required:

- Login
- Member dashboard
- Admin dashboard
- Events
- Vote
- Finance
- Library
- Marketplace
- Settings/profile

After product owner approval, tick:

```text
[ ] Store screenshots approved
```

## Requires Product Owner/Admin Setup

### Demo Reviewer Accounts Working

Create dedicated reviewer accounts. Do not use real personal member accounts.

Minimum:

- Admin reviewer
- Member reviewer
- Electoral chairman reviewer

Store passwords only in a secure password manager. Confirm each account can
sign in to the exact build submitted for review.

After verification, tick:

```text
[ ] Demo reviewer accounts working
```

### Incident-Response Contacts Assigned

Fill `docs/INCIDENT_RESPONSE_CONTACTS.md` with real primary and backup owners
for:

- Product owner
- Firebase/GCP owner
- Apple developer account owner
- Google Play account owner
- Release engineer
- Member support lead
- Treasurer/finance lead
- Electoral chairman

After real contacts are recorded privately, tick:

```text
[ ] Incident-response contacts assigned
```

## Deferred Or Intentionally Not Current Priority

These remain unchecked unless product direction changes:

```text
[ ] Development Firebase project configured
[ ] Staging Firebase project configured
[ ] Blaze staging deployment verified before production deployment
[ ] Cloud Functions deployed to staging
[ ] Android production signing complete
[ ] Google Play internal/closed testing complete
```

Current fast-track release path intentionally prioritises production iOS
validation. Android EAS remains deferred.
