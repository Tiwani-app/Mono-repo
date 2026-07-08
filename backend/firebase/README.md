# Canonical Firebase Workspace

This folder is the canonical Firebase workspace and production deploy path for
the Option 3 monorepo layout.

Canonical Firebase workspace:

```text
backend/firebase/
```

Canonical Cloud Functions backend:

```text
backend/firebase/functions/
```

The mobile/root Git cutover is complete: the repository root is `Tiwani/`, the
mobile app lives at `apps/mobile/`, and the previous `frontend/` workspace has
been removed (its history is preserved in Git). Do not deploy from the
top-level `backend/` folder; this `backend/firebase/` workspace is the only
Firebase deploy path.

## Workspace Contents

```text
backend/firebase/
  firebase.json
  .firebaserc
  firestore.rules
  firestore.indexes.json
  storage.rules
  functions/
  public/
  scripts/
```

The `functions/` package intentionally excludes `node_modules/`, build output,
logs, and private environment files.

## Verification Commands

From the repository root:

```bash
npm run functions:build
npm run functions:test
npm run rules:test
```

Direct package commands:

```text
cd backend/firebase/functions
npm run build
npm test
```

## Deployment Status

Phase 4 production safety gate passed on July 7, 2026:

```text
[x] Rules tests passed from backend/firebase
[x] Functions build passed from backend/firebase/functions
[x] Firebase CLI resolved project tiwani-backend from backend/firebase
[x] firebase.json source is functions
[x] Firestore and Storage rules deployed to tiwani-backend
[x] 40 Cloud Functions deployed to tiwani-backend, 0 errored, 0 aborted
```

Deploy commands:

```bash
cd backend/firebase
npx firebase-tools deploy --project tiwani-backend --only firestore:rules,storage
npx firebase-tools deploy --project tiwani-backend --only functions
```
