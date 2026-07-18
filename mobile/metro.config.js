const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// npm-workspace monorepo: watch the whole repo (for packages/shared), and
// resolve modules from the app's own node_modules first, then the hoisted
// root. Safe with hierarchical lookup because web + mobile pin the SAME
// react/react-dom version (19.x) — if the versions ever diverge again, the
// RN bundle must be re-checked for a duplicate react (see CLAUDE.md gotchas).
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
