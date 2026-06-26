# iOS Release Candidate Handoff

Last updated: June 24, 2026

Use this when preparing the first iOS `productionCandidate` build for
real-device App Check, Crashlytics, and TestFlight readiness checks.

## Current State

```text
EAS project: @dejiriley/tiwani
EAS project ID: 39d30076-8431-410f-9d2f-eb8f8787a20e
Bundle ID: com.tiwani.app
Firebase project: tiwani-backend
Firebase project number: 898397481054
Firebase iOS app ID: 1:898397481054:ios:08f0042ec7371de4a56ccf
Build profile: productionCandidate
Distribution: internal
```

The app code and production Firebase backend are ready for a real-device iOS
release-candidate build. The active blocker is iOS signing credentials in EAS.
As of June 23, 2026, `npx eas build:list --platform ios --limit 5` showed no
recorded iOS builds for `@dejiriley/tiwani`.

Build retry on June 24, 2026:

```text
npx eas build --platform ios --profile productionCandidate --non-interactive
```

Result:

```text
Failed to set up credentials.
You're in non-interactive mode. EAS CLI couldn't find any credentials suitable
for internal distribution. Run this command again in interactive mode.
```

EAS also reported that `ios.bundleIdentifier` from `app.config.js` is ignored
because the native `ios/` directory exists. The native Xcode project currently
uses `PRODUCT_BUNDLE_IDENTIFIER = com.tiwani.app`.

## Credential Setup

Run this locally from `frontend/`:

```bash
npx eas credentials --platform ios
```

Choose:

```text
Project/profile: productionCandidate
Action: Build Credentials
Credential option: All, set up all required credentials
```

Then authenticate with the Apple Developer account that owns
`com.tiwani.app`, or provide a prepared `credentials.json`.

Do not paste Apple credentials into chat. Do not commit `credentials.json`,
private keys, provisioning profiles, certificates, or exported passwords.

## Build Command

After credentials are configured:

```bash
npx eas build --platform ios --profile productionCandidate --non-interactive
```

## Real-Device Validation

Install the resulting internal build on a physical iPhone. Simulator testing is
not enough for App Check.

Validate:

- App launches without native Firebase module crashes.
- Login restores admin, member, and electoral chairman profiles.
- App Check requests appear in Firebase Console monitoring mode.
- Crashlytics receives startup/session data and user context attributes.
- Push permission and token registration behave correctly.
- Events, voting, finance, library, marketplace, notifications, and settings
  smoke tests pass using `docs/RELEASE_CANDIDATE_QA_CHECKLIST.md`.

## App Check Enforcement Gate

Only enforce App Check for Firestore, Storage, and Functions after the physical
iOS build shows valid App Check traffic in monitoring mode.

If enforcement breaks login/profile restore, immediately disable enforcement,
capture the affected service and build number, then inspect App Check provider
configuration before retrying.
