#!/usr/bin/env sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"

fail() {
  echo "Production-gate check failed: $*" >&2
  exit 1
}

require_file() {
  if [ ! -f "$ROOT/$1" ]; then
    fail "missing file: $1"
  fi
}

require_dir() {
  if [ ! -d "$ROOT/$1" ]; then
    fail "missing directory: $1"
  fi
}

require_no_debug_logs() {
  dir="$ROOT/$1"
  if [ ! -d "$dir" ]; then
    fail "missing directory: $1"
  fi

  found="$(
    find "$dir" -maxdepth 1 -type f \( -name 'firebase-debug.log' -o -name 'firestore-debug.log' -o -name '*-debug.log' \) -print
  )"

  if [ -n "$found" ]; then
    echo "$found" >&2
    fail "$1 contains generated Firebase debug logs"
  fi
}

require_file "package.json"
require_file "apps/mobile/package.json"
require_file "apps/mobile/eas.json"
require_file "apps/mobile/app.config.js"
require_file "backend/firebase/.firebaserc"
require_file "backend/firebase/firebase.json"
require_file "backend/firebase/firestore.rules"
require_file "backend/firebase/firestore.indexes.json"
require_file "backend/firebase/storage.rules"
require_file "backend/firebase/functions/package.json"
require_file "backend/firebase/functions/src/index.ts"
require_dir "backend/firebase/functions/src"
require_dir "apps/mobile/src"

require_no_debug_logs "backend/firebase"

# Private env files and native Firebase config may exist in the working tree,
# but every one of them must be ignored by Git so it can never be committed.
unignored="$(
  find "$ROOT/apps" "$ROOT/backend" -type f \
    \( \( -name '.env*' ! -name '.env.example' \) \
       -o -name 'GoogleService-Info.plist' \
       -o -name 'google-services.json' \) \
    -not -path '*/node_modules/*' -not -path '*/Pods/*' |
    while IFS= read -r f; do
      rel="${f#"$ROOT"/}"
      git -C "$ROOT" check-ignore -q "$rel" || printf '%s\n' "$rel"
    done
)"
if [ -n "$unignored" ]; then
  echo "$unignored" >&2
  fail "secret/native config files above are not gitignored"
fi

node - "$ROOT" <<'NODE'
const fs = require('fs');
const path = require('path');

const root = process.argv[2];

const fail = (message) => {
  console.error(`Production-gate check failed: ${message}`);
  process.exit(1);
};

const readJson = (relativePath) => {
  const filePath = path.join(root, relativePath);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`${relativePath} is not valid JSON: ${error.message}`);
  }
};

const assert = (condition, message) => {
  if (!condition) {
    fail(message);
  }
};

const rootPackage = readJson('package.json');
const mobilePackage = readJson('apps/mobile/package.json');
const functionsPackage = readJson('backend/firebase/functions/package.json');
const firebaseConfig = readJson('backend/firebase/firebase.json');
const firebaseRc = readJson('backend/firebase/.firebaserc');
const easConfig = readJson('apps/mobile/eas.json');

assert(rootPackage.private === true, 'root package.json must remain private');
// No "workspaces" field on purpose: installs are per-package, and a declared
// workspace root makes Expo/Metro look for a root node_modules that never
// exists here.
assert(
  rootPackage.workspaces === undefined,
  'root package.json must not declare npm workspaces (per-package installs)',
);
assert(
  rootPackage.scripts?.['verify'] &&
    rootPackage.scripts?.['mobile:typecheck'] &&
    rootPackage.scripts?.['functions:build'],
  'root package.json must expose canonical verification scripts',
);

assert(firebaseRc.projects?.default === 'tiwani-backend', '.firebaserc default project must be tiwani-backend');
assert(firebaseRc.projects?.production === 'tiwani-backend', '.firebaserc production project must be tiwani-backend');
assert(firebaseConfig.functions?.source === 'functions', 'backend/firebase functions.source must be functions');
assert(firebaseConfig.functions?.runtime === 'nodejs22', 'backend/firebase functions.runtime must be nodejs22');
assert(firebaseConfig.firestore?.rules === 'firestore.rules', 'backend/firebase Firestore rules path is wrong');
assert(firebaseConfig.storage?.rules === 'storage.rules', 'backend/firebase Storage rules path is wrong');

assert(functionsPackage.engines?.node === '22', 'Cloud Functions package must target Node 22');
assert(functionsPackage.scripts?.build === 'tsc', 'Cloud Functions build script must run tsc');
assert(functionsPackage.scripts?.test, 'Cloud Functions test script is required');

assert(mobilePackage.name === 'tiwani', 'mobile package name must remain tiwani');
assert(mobilePackage.scripts?.functions === undefined, 'mobile package should not expose an ambiguous functions script');
assert(
  mobilePackage.scripts?.['functions:build']?.includes('../../backend/firebase/functions'),
  'mobile functions:build must point at backend/firebase/functions',
);
assert(
  mobilePackage.scripts?.['test:rules:emulator']?.includes('../../backend/firebase'),
  'mobile rules emulator script must run from backend/firebase',
);

const productionCandidate = easConfig.build?.productionCandidate;
const production = easConfig.build?.production;
assert(productionCandidate?.env?.EXPO_PUBLIC_APP_ENV === 'production', 'productionCandidate must use production app env');
assert(production?.env?.EXPO_PUBLIC_APP_ENV === 'production', 'production must use production app env');
assert(easConfig.submit?.production?.ios?.ascAppId === '6785173850', 'EAS submit ascAppId must be Tiwani app id');
NODE

echo "Static production-gate checks passed."
