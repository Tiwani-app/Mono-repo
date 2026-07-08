# Tiwani launch setup

The application code is wired to Firebase, but production credentials and
provider accounts must be supplied outside the repository.

## Firebase project

1. Create or select the Firebase project and enable Authentication, Firestore,
   Cloud Storage, Cloud Messaging, and Cloud Functions.
2. Register iOS bundle ID `com.tiwani.app` and Android package
   `com.tiwani.app`.
3. Download `GoogleService-Info.plist` and `google-services.json` into
   `apps/mobile/`. These files are intentionally gitignored.
4. Confirm `apps/mobile/app.config.js` points to the correct platform file paths
   before generating or rebuilding native projects:

   ```json
   "ios": {
     "bundleIdentifier": "com.tiwani.app",
     "googleServicesFile": "./GoogleService-Info.plist"
   },
   "android": {
     "package": "com.tiwani.app",
     "googleServicesFile": "./google-services.json"
   }
   ```

5. Run `npx expo prebuild`, then run
   `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx pod-install` for iOS.
6. Run Firebase deploys from `backend/firebase/`, not from the top-level
   `backend/` folder:

   ```sh
   cd backend/firebase
   npx firebase-tools deploy --project tiwani-backend --only functions,firestore:rules,storage
   ```

   For rules-only fixes:

   ```sh
   cd backend/firebase
   npx firebase-tools deploy --project tiwani-backend --only firestore:rules
   ```

## External delivery

Automatic member account creation is now handled by the deployed Cloud
Functions backend on the Blaze-backed production project. Do not recreate the
old Spark-only manual provisioning workflow unless the production backend is
unavailable and the workaround is explicitly approved.

For push notifications, upload APNs credentials for iOS and complete the
Firebase Cloud Messaging setup for both platforms.

## Validation

Run:

Run from the repository root:

```sh
npm run mobile:typecheck
npm run mobile:lint
npm run mobile:test
npm run rules:test
npm run functions:build
```

Use the Firebase emulators for end-to-end Firestore and Storage rule tests
before the first production deploy.

On this machine, Homebrew OpenJDK is installed keg-only. Add it to the shell
before running Firebase emulators:

```sh
export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"
```
