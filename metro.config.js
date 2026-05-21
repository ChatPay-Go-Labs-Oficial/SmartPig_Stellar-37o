const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Handle ESM packages (smart-account-kit, @stellar/stellar-sdk)
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ['browser', 'require', 'default', 'import'];

// Support .mjs and .cjs files
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

// Shim Node.js built-ins used by @stellar/stellar-sdk Horizon client.
// We only use Soroban/RPC — Horizon SSE is not needed in React Native.
config.resolver.extraNodeModules = {
  http: path.resolve(__dirname, 'shims/http.js'),
  https: path.resolve(__dirname, 'shims/https.js'),
  stream: path.resolve(__dirname, 'shims/stream.js'),
  util: path.resolve(__dirname, 'shims/util.js'),
  url: require.resolve('react-native-url-polyfill'),
  events: require.resolve('events'),
};

// Redirect npm packages that import Node built-ins (eventsource → stub)
// Also redirect stellar-sdk to no-axios variant so it uses fetch (not XMLHttpRequest via axios),
// which uses React Native's native fetch implementation and works more reliably on Android.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'eventsource') {
    return { filePath: path.resolve(__dirname, 'shims/eventsource.js'), type: 'sourceFile' };
  }
  if (moduleName === '@stellar/stellar-sdk') {
    return context.resolveRequest(context, '@stellar/stellar-sdk/no-axios', platform);
  }
  if (moduleName === '@stellar/stellar-sdk/contract') {
    return context.resolveRequest(context, '@stellar/stellar-sdk/no-axios/contract', platform);
  }
  if (moduleName === '@stellar/stellar-sdk/rpc') {
    return context.resolveRequest(context, '@stellar/stellar-sdk/no-axios/rpc', platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
