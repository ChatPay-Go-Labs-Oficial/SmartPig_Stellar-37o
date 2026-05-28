const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ['browser', 'require', 'default', 'import'];

config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

config.resolver.extraNodeModules = {
  http: path.resolve(__dirname, 'shims/http.js'),
  https: path.resolve(__dirname, 'shims/https.js'),
  stream: path.resolve(__dirname, 'shims/stream.js'),
  util: path.resolve(__dirname, 'shims/util.js'),
  url: require.resolve('react-native-url-polyfill'),
  events: require.resolve('events'),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'eventsource') {
    return { filePath: path.resolve(__dirname, 'shims/eventsource.js'), type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
