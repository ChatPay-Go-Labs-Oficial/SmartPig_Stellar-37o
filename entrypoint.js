// react-native-get-random-values MUST come first — before any crypto lib checks for it
import 'react-native-get-random-values';
import '@ethersproject/shims';
import 'expo-router/entry';

if (typeof global.crypto?.getRandomValues === 'function') {
  const orig = global.crypto.getRandomValues;
  global.crypto.getRandomValues = function (array) {
    const result = orig.call(global.crypto, array);
    return result ?? array;
  };
}
