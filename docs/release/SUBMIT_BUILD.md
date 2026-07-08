# Submitting the Next Build

Simple steps to get a new build into TestFlight (iOS) and Google Play internal
testing (Android).

**Always run EAS commands from `apps/mobile/`, never from the repo root.**
Running EAS at the root creates a new, wrong EAS project. The correct project
is `tiwani`, owned by the **`tiwani-app` Expo organization** (set as `owner`
in `app.config.js`).

Log in with **your own** Expo account — it must be a member of the
`tiwani-app` organization (an org admin invites you under
expo.dev → tiwani-app → Members, role: Developer). Builds and submits use the
org-owned signing credentials and version counters, so you never need Apple
or Google Play credentials for routine releases.

```bash
cd apps/mobile
npx eas-cli login    # your own account
npx eas-cli whoami   # your username; org membership is what matters
```

---

## iOS → TestFlight

1. Build:

   ```bash
   npx eas-cli build --platform ios --profile productionCandidate --non-interactive
   ```

   Wait for "Build finished". Note the build ID printed with the build
   details URL.

2. Submit to App Store Connect (uses the stored API key and app ID
   `6785173850` automatically):

   ```bash
   npx eas-cli submit --platform ios --latest --profile production --non-interactive
   ```

   (Use `--id <build-id>` instead of `--latest` to submit a specific build.)

3. Wait for Apple processing (10–60 min), then in
   [App Store Connect → TestFlight](https://appstoreconnect.apple.com/apps/6785173850/testflight/ios):
   - Answer the export-compliance question if prompted (standard encryption
     only → No).
   - Attach the new build to the external group `Testing`.

4. Testers install/update through the TestFlight invite link.

---

## Android → Google Play internal testing

1. Build (signed with the EAS-managed upload keystore):

   ```bash
   npx eas-cli build --platform android --profile productionCandidate --non-interactive
   ```

2. Download the `.aab` from the build details page (or
   `npx eas-cli build:list --platform android --limit 1` for the URL).

3. Upload manually in
   [Play Console](https://play.google.com/console) → Tiwani (`com.tiwani.app`)
   → Testing → Internal testing → **Create new release**:
   - Upload the `.aab`.
   - Add short release notes.
   - Review and roll out to internal testing.

4. Testers install through the internal-testing opt-in link
   (Testers tab → copy link). The install must come through Play for
   App Check / Play Integrity to attest.

Manual upload is required until a Play Console service account is created and
wired into `eas.json` (`submit.production.android`). After that, step 2–3
become:

```bash
npx eas-cli submit --platform android --latest --profile production --non-interactive
```

---

## Version numbers

Versions are managed remotely by EAS (`appVersionSource: "remote"`):
the marketing version stays `2.1.0` unless changed in `app.config.js`, and
the iOS build number / Android versionCode auto-increment on each
`productionCandidate`/`production` build. Never accept an EAS prompt to
generate a new Android keystore — the existing upload keystore lives in EAS
credentials.

## After submitting

- Smoke-test the installed build on a real device (sign-in, directory,
  events, a poll, finance ledger).
- Check Crashlytics and App Check graphs in the Firebase console for the new
  build's traffic.
- Record the build ID, version, and QA result in `docs/` release notes.
