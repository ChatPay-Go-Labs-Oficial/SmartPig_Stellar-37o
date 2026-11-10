// node --import tsx --test lib/utils/piggy.test.ts  (npm test)
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  addDecimalStrings,
  amountTier,
  fromUnits,
  joinAssetNames,
  piggyAsset,
  splitAmount,
  toPlainDecimal,
  toUnits,
  trimDecimal,
} from './piggy';

test('toPlainDecimal: expands the scientific notation Prisma Decimal emits', () => {
  assert.equal(toPlainDecimal('3e-7'), '0.0000003');
  assert.equal(toPlainDecimal('1.5e-7'), '0.00000015');
  assert.equal(toPlainDecimal('0.1e-6'), '0.0000001');
  assert.equal(toPlainDecimal('2.5E3'), '2500');
  assert.equal(toPlainDecimal('-4e-2'), '-0.04');
  assert.equal(toPlainDecimal('0e-7'), '0');
});

test('toPlainDecimal: plain decimals pass through untouched', () => {
  assert.equal(toPlainDecimal('10.5'), '10.5');
  assert.equal(toPlainDecimal(' 42 '), '42');
});

test('addDecimalStrings: exact sum without floating point, truncated to 7 places', () => {
  assert.equal(addDecimalStrings(['0.1', '0.2']), '0.3000000');
  assert.equal(addDecimalStrings(['1.00000019', '2']), '3.0000001');
  assert.equal(addDecimalStrings(['3e-7', '0.0000001']), '0.0000004');
  assert.equal(addDecimalStrings(['10', '-2.5']), '7.5000000');
  assert.equal(addDecimalStrings([]), '0.0000000');
});

test('addDecimalStrings: skips values that are not decimals', () => {
  assert.equal(addDecimalStrings(['1', 'abc', '2']), '3.0000000');
});

test('toUnits / fromUnits: stroops round trip, truncating extra places', () => {
  assert.equal(toUnits('10.5'), 105_000_000n);
  assert.equal(toUnits('0.00000019'), 1n);
  assert.equal(toUnits('3e-7'), 3n);
  assert.equal(toUnits('-1.25'), -12_500_000n);
  assert.equal(toUnits(''), 0n);
  assert.equal(fromUnits(105_000_000n), '10.5000000');
  assert.equal(fromUnits(-12_500_000n), '-1.2500000');
  assert.equal(fromUnits(toUnits('123.4567891')), '123.4567891');
  assert.equal(fromUnits(5n, 0), '5');
});

test('trimDecimal: drops trailing zeros and a dangling point', () => {
  assert.equal(trimDecimal('10.5000000'), '10.5');
  assert.equal(trimDecimal('10.0000000'), '10');
  assert.equal(trimDecimal('100'), '100');
});

test('splitAmount: grouped integer with prefix, fraction truncated never rounded', () => {
  assert.deepEqual(splitAmount('1284530.58219379', '$'), {
    integer: '$1,284,530',
    fraction: '.5821937',
  });
  assert.deepEqual(splitAmount('0.5'), { integer: '0', fraction: '.5000000' });
  assert.deepEqual(splitAmount('007'), { integer: '7', fraction: '.0000000' });
  assert.deepEqual(splitAmount('12', '€', 0), { integer: '€12', fraction: '' });
});

test('amountTier: shrinks as the integer grows, ignoring separators', () => {
  assert.equal(amountTier('$250'), 0);
  assert.equal(amountTier('$12,345'), 1);
  assert.equal(amountTier('$1,284,530'), 2);
  assert.equal(amountTier('$123,456,789'), 3);
});

test('piggyAsset: known assets case-insensitively, null otherwise', () => {
  assert.equal(piggyAsset('usdc'), 'USDC');
  assert.equal(piggyAsset('EURC'), 'EURC');
  assert.equal(piggyAsset('BTC'), null);
});

test('joinAssetNames: Lite reads as a sentence, Pro as tickers', () => {
  assert.equal(joinAssetNames(['Dólar'], false), 'Dólar');
  assert.equal(joinAssetNames(['Dólar', 'Euro'], false), 'Dólar e euro');
  assert.equal(
    joinAssetNames(['Dólar', 'Euro', 'Criptomoeda'], false),
    'Dólar, euro e criptomoeda',
  );
  assert.equal(joinAssetNames(['USDC', 'EURC'], true), 'USDC + EURC');
});
