# Tiwani Tools Workspace

Repo-level checks and maintenance tooling.

## Checks

Run the non-destructive structure and command-path check from the monorepo
root:

```bash
npm run verify:layout
```

Run the static production-gate check (config, identifiers, secret hygiene):

```bash
npm run verify:production
```

Neither check installs dependencies, builds the app, builds Cloud Functions,
or deploys Firebase resources. `npm run verify` chains these with the full
typecheck/lint/test/build pipeline.

Operational data scripts (seeding, backfills) live in
`backend/firebase/scripts/`; the mobile postinstall patch lives in
`apps/mobile/scripts/`.
