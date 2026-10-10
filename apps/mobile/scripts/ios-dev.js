// `npm run ios`: start the iOS dev app on the booted simulator, with a native
// binary that matches the code.
//
// The dev client only reloads JavaScript. When native code changes (a package
// with an iOS half is added, pods change, or a different simulator is booted
// with an older build installed), the JavaScript can reach for native modules
// the installed app doesn't have and crash at launch ("Cannot find native
// module 'ExpoPrint'", then "App entry not found").
//
// This script fingerprints the native side of the project (app config, the
// native packages and their autolinking) and remembers, per simulator, which fingerprint it last
// installed there. It rebuilds only when they differ, otherwise it just starts
// Metro. ios/ is gitignored, so the fingerprint skips hand edits inside it;
// use --rebuild after changing native files directly.
//
//   npm run ios                rebuild only if needed, then start Metro
//   npm run ios -- --rebuild   force a native rebuild

const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createFingerprintAsync } = require('@expo/fingerprint');

const projectRoot = path.join(__dirname, '..');
// .expo/ is gitignored and outside what the fingerprint hashes.
const stateFile = path.join(projectRoot, '.expo', 'ios-native-fingerprints.json');
const bundleId = 'com.tiwani.app';

// CocoaPods crashes without a UTF-8 locale ("Unicode Normalization not
// appropriate for ASCII-8BIT"), and shells launched from editors often have none.
const env = { ...process.env, LANG: process.env.LANG || 'en_US.UTF-8' };

const run = (command, args, cwd = projectRoot) => {
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const bootedSimulator = () => {
  const output = execFileSync('xcrun', ['simctl', 'list', 'devices', 'booted', '-j'], {
    encoding: 'utf8',
  });
  return Object.values(JSON.parse(output).devices).flat()[0] ?? null;
};

const isAppInstalled = (udid) =>
  spawnSync('xcrun', ['simctl', 'get_app_container', udid, bundleId], {
    stdio: 'ignore',
  }).status === 0;

const readState = () => {
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch {
    return {};
  }
};

const metroIsRunning = async () => {
  try {
    const response = await fetch('http://localhost:8081/status');
    return (await response.text()).includes('packager-status:running');
  } catch {
    return false;
  }
};

const nativeFingerprint = async () =>
  (await createFingerprintAsync(projectRoot, { platforms: ['ios'] })).hash;

const main = async () => {
  // Pods are generated from node_modules, so it has to match the lockfile first.
  if (spawnSync('npm', ['ls', '--depth=0'], { cwd: projectRoot, stdio: 'ignore' }).status !== 0) {
    console.log('› node_modules is out of sync with package-lock.json. Running npm ci…');
    run('npm', ['ci']);
  }

  let device = bootedSimulator();
  const forced = process.argv.includes('--rebuild');
  const fingerprint = await nativeFingerprint();
  const upToDate =
    device &&
    !forced &&
    readState()[device.udid] === fingerprint &&
    isAppInstalled(device.udid);

  if (upToDate) {
    console.log(`› ${device.name}: installed app matches the native code. No rebuild needed.`);
  } else {
    console.log(
      `› ${device ? device.name : 'Simulator'}: ${
        forced ? 'rebuild requested' : 'installed app is missing or out of date'
      }. Rebuilding…`,
    );
    run('pod', ['install'], path.join(projectRoot, 'ios'));
    run('npx', ['expo', 'run:ios', '--no-bundler', ...(device ? ['--device', device.udid] : [])]);
    device = bootedSimulator();
    // Recompute: pod install can rewrite Podfile.lock.
    const builtFingerprint = await nativeFingerprint();
    fs.mkdirSync(path.dirname(stateFile), { recursive: true });
    fs.writeFileSync(
      stateFile,
      JSON.stringify({ ...readState(), [device.udid]: builtFingerprint }, null, 2),
    );
  }

  // Reuse a Metro that's already serving instead of failing on the busy port.
  if (await metroIsRunning()) {
    console.log('› Metro is already running on port 8081. Opening the app on it…');
    run('xcrun', [
      'simctl',
      'openurl',
      device.udid,
      'exp+tiwani://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081',
    ]);
    return;
  }
  run('npx', ['expo', 'start', '--dev-client', '--ios']);
};

main();
