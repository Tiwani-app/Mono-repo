# Tiwani

Tiwani is a mobile membership management app for associations and cooperatives.

The Option 3 monorepo migration is complete. The Git repository root is this
folder, and the old `frontend/` tree has been removed (its history is
preserved in Git — the mobile app files were moved, not recreated).

```text
Tiwani/
  apps/mobile/              Mobile app (Expo / React Native)
  backend/firebase/         Firebase workspace: Functions, rules, hosting, scripts
  docs/                     Product, release, and operations documentation
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

## Migration References

The migration history is documented in:

```text
MONOREPO_PREP_AND_MIGRATION_PLAN.md
MONOREPO_CLEANUP_AND_MIGRATION_PLAN.md
MONOREPO_PHASE2_READINESS_CHECKLIST.md
```

These are historical records; the structure above is current. Command names
`verify:phase2`–`verify:phase4` mentioned in them were replaced by
`verify:layout`, `verify:production`, and `verify` after the Git cutover.
