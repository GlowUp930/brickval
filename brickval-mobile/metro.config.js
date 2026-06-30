// Metro config files are loaded by Node before TypeScript transpilation.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getDefaultConfig } = require("expo/metro-config");

module.exports = getDefaultConfig(__dirname);
