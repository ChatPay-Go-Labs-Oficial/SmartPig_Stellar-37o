#!/usr/bin/env node
// Patches @stellar/js-xdr dist/xdr.js to fix Hermes (React Native) Buffer.subarray() bug.
// In Hermes, Buffer.subarray() returns a plain Uint8Array instead of a Buffer.
// Uint8Array.toString('base64') ignores the encoding argument and returns comma-separated
// decimal bytes ("0,0,0,7,...") — breaking XDR base64/hex serialization.
// Fix: wrap the subarray result with h.from() (the bundled Buffer class) before calling toString.

const fs = require('fs');
const path = require('path');

const target = path.resolve(__dirname, '../node_modules/@stellar/js-xdr/dist/xdr.js');

if (!fs.existsSync(target)) {
  console.log('[patch-xdr] File not found, skipping:', target);
  process.exit(0);
}

let src = fs.readFileSync(target, 'utf8');

const OLD = 'case"hex":return t.toString("hex");case"base64":return t.toString("base64")';
const NEW = 'case"hex":return h.from(t).toString("hex");case"base64":return h.from(t).toString("base64")';

if (src.includes(NEW)) {
  console.log('[patch-xdr] Already patched, skipping.');
  process.exit(0);
}

if (!src.includes(OLD)) {
  console.warn('[patch-xdr] WARNING: Expected pattern not found. The package may have changed.');
  process.exit(0);
}

src = src.replace(OLD, NEW);
fs.writeFileSync(target, src, 'utf8');
console.log('[patch-xdr] Patched @stellar/js-xdr/dist/xdr.js successfully.');
