const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [monorepoRoot];

// Let Metro know where to resolve packages from
// IMPORTANT: project-level node_modules must come first so that
// babel-preset-expo can resolve expo-router (both live here).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Enable package.json "exports" field resolution
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
