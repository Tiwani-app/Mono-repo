# Backend

The Firebase backend lives in `firebase/`:

```text
backend/firebase/
  firebase.json
  .firebaserc
  firestore.rules
  firestore.indexes.json
  storage.rules
  functions/        Cloud Functions (Node 22, TypeScript)
  public/           Firebase Hosting content
  scripts/          Operational/admin scripts (run with firebase-admin)
```

This is the only Firebase deploy path. The legacy stale copies of
`firebase.json` and the rules files that used to sit directly in this folder
were removed after `backend/firebase/` was verified with production deploys on
July 7, 2026.

Deploy commands:

```bash
cd backend/firebase
npx firebase-tools deploy --project tiwani-backend --only functions,firestore:rules,storage
```

See `backend/firebase/README.md` for verification commands and deployment
status.
