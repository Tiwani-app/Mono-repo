# Tiwani

Tiwani is a mobile membership management app for associations, cooperatives, and member-run organizations that want less admin chaos and more engaged members.

No more scattered WhatsApp threads, lost spreadsheets, or “who paid what?” confusion. Tiwani puts membership, money, meetings, voting, and documents in one place. On every member’s phone.

```text
Tiwani/
  apps/mobile/              Mobile app (Expo / React Native)
  backend/firebase/         Firebase workspace: Functions, rules, hosting, scripts
  docs/                     
  tools/                    Repo-level checks and maintenance tooling
```

## Root Commands

Run cross-project commands from the repository root:

```bash
npm run mobile:typecheck
npm run mobile:lint
npm run mobile:test
npm run functions:build
npm run functions:test
npm run rules:test
npm run verify:layout        # structural/path checks
npm run verify:production    # static production-gate checks
npm run verify               # everything above in one pass
```

Development app commands:

```bash
npm run mobile:start
npm run mobile:ios
npm run mobile:android
```

Dependencies are installed per package (there is no root install):

```bash
npm --prefix apps/mobile ci
npm --prefix backend/firebase/functions ci
```

## Key Identifiers

```text
Firebase production project: tiwani-backend
iOS bundle ID / Android package: com.tiwani.app
```

## Deployment

Firebase deploys run only from `backend/firebase/`:

```bash
cd backend/firebase
npx firebase-tools deploy --project tiwani-backend --only functions,firestore:rules,storage
```

Rules-only deploy:

```bash
cd backend/firebase
npx firebase-tools deploy --project tiwani-backend --only firestore:rules
```

Mobile builds run from `apps/mobile/` with EAS:

```bash
cd apps/mobile
npx eas build --platform ios --profile productionCandidate
```
