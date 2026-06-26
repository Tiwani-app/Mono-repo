const fs = require('fs');
const path = require('path');

const settingsPath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@react-native',
  'gradle-plugin',
  'settings.gradle.kts',
);

const pluginPattern =
  /id\("org\.gradle\.toolchains\.foojay-resolver-convention"\)\.version\("[^"]+"\)/;
const patchedPlugin =
  'id("org.gradle.toolchains.foojay-resolver-convention").version("1.0.0")';

if (!fs.existsSync(settingsPath)) {
  console.warn('[postinstall] React Native Gradle plugin settings file was not found.');
  process.exit(0);
}

const source = fs.readFileSync(settingsPath, 'utf8');

if (source.includes(patchedPlugin)) {
  console.log('[postinstall] React Native Gradle plugin already uses Foojay resolver 1.0.0.');
  process.exit(0);
}

if (!pluginPattern.test(source)) {
  throw new Error(
    '[postinstall] Could not find the Foojay resolver declaration in React Native Gradle plugin settings.',
  );
}

fs.writeFileSync(settingsPath, source.replace(pluginPattern, patchedPlugin));
console.log('[postinstall] Patched React Native Gradle plugin for Gradle 9 toolchain resolution.');
