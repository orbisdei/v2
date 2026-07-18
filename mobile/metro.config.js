const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// npm-workspace monorepo: watch the whole repo (for packages/shared), and
// resolve modules from the app's own node_modules first, then the hoisted
// root. disableHierarchicalLookup stops any library hoisted to the root from
// walking up and grabbing the web app's react@18 — every react/react-dom
// resolution lands on mobile/node_modules/react@19.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
