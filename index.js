// Custom entry point — uses require() (not import) to guarantee execution order.
// ES `import` statements are hoisted by Metro, so we must use require() here
// to ensure crypto is patched BEFORE @noble/hashes/crypto.js captures globalThis.crypto.

// Step 1: patch globalThis.crypto.getRandomValues using expo-crypto
const { getRandomValues } = require('expo-crypto');
if (typeof globalThis.crypto !== 'object' || globalThis.crypto === null) {
  globalThis.crypto = {};
}
globalThis.crypto.getRandomValues = getRandomValues;

// Step 2: rest of WalletConnect polyfills (TextEncoder, URL, Buffer, btoa/atob…)
require('@walletconnect/react-native-compat');

// Step 3: load the app
require('expo-router/entry');
