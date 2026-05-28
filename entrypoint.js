// Import required polyfills first
import '@ethersproject/shims';
import 'react-native-get-random-values';
import 'expo-router/entry';

if (typeof global.crypto?.getRandomValues === 'function') {
  const orig = global.crypto.getRandomValues;
  global.crypto.getRandomValues = function (array) {
    const result = orig.call(global.crypto, array);
    return result ?? array;
  };
}
