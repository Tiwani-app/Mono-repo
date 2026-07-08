#!/usr/bin/env sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"

fail() {
  echo "Layout check failed: $*" >&2
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

forbid_path() {
  if [ -e "$ROOT/$1" ]; then
    fail "stale pre-migration path exists: $1"
  fi
}

require_contains() {
  file="$1"
  pattern="$2"
  if ! grep -F "$pattern" "$ROOT/$file" >/dev/null; then
    fail "$file does not contain expected text: $pattern"
  fi
}

# Monorepo structure
require_file "package.json"
require_file "README.md"
require_file ".gitignore"
require_dir "docs"
require_dir "tools"

# Mobile app
require_file "apps/mobile/package.json"
require_file "apps/mobile/package-lock.json"
require_file "apps/mobile/app.config.js"
require_file "apps/mobile/eas.json"
require_file "apps/mobile/App.tsx"
require_file "apps/mobile/scripts/patch-react-native-gradle-plugin.js"
require_dir "apps/mobile/src"
require_dir "apps/mobile/ios"
require_dir "apps/mobile/android"

# Firebase workspace
require_file "backend/firebase/firebase.json"
require_file "backend/firebase/.firebaserc"
require_file "backend/firebase/firestore.rules"
require_file "backend/firebase/firestore.indexes.json"
require_file "backend/firebase/storage.rules"
require_file "backend/firebase/functions/package.json"
require_file "backend/firebase/functions/package-lock.json"
require_file "backend/firebase/functions/tsconfig.json"
require_file "backend/firebase/README.md"
require_dir "backend/firebase/functions/src"
require_dir "backend/firebase/functions/test"
require_dir "backend/firebase/public"
require_dir "backend/firebase/scripts"

# Old layout must not reappear
forbid_path "frontend"
forbid_path "backend/firebase.json"
forbid_path "backend/firestore.rules"
forbid_path "backend/storage.rules"
forbid_path "backend/firestore.indexes.json"
forbid_path "apps/mobile/functions"
forbid_path "apps/mobile/firebase.json"
forbid_path "apps/mobile/firestore.rules"
forbid_path "apps/mobile/storage.rules"

node -e "JSON.parse(require('fs').readFileSync('$ROOT/package.json', 'utf8')); JSON.parse(require('fs').readFileSync('$ROOT/apps/mobile/package.json', 'utf8')); JSON.parse(require('fs').readFileSync('$ROOT/backend/firebase/functions/package.json', 'utf8')); JSON.parse(require('fs').readFileSync('$ROOT/backend/firebase/firebase.json', 'utf8'));"

# Cross-package command paths
require_contains "package.json" "apps/mobile"
require_contains "package.json" "backend/firebase/functions"
require_contains "apps/mobile/package.json" "../../backend/firebase/functions"
require_contains "apps/mobile/package.json" "TIWANI_FIREBASE_WORKSPACE=../../backend/firebase"
require_contains "apps/mobile/src/__tests__/firebaseRulesConfig.test.ts" "../../backend/firebase"
require_contains "apps/mobile/src/__tests__/firestoreRulesEmulator.spec.ts" "../../backend/firebase"
require_contains "backend/firebase/firebase.json" "\"source\": \"functions\""

echo "Monorepo layout looks good."
