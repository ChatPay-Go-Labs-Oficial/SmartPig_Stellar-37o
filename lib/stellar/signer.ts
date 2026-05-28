import type { CurveSigningChainType } from '@privy-io/api-types';

type SignRawHashFn = (input: {
  address: string;
  chainType: CurveSigningChainType;
  hash: `0x${string}`;
}) => Promise<{ signature: `0x${string}` }>;

let _signRawHash: SignRawHashFn | null = null;

export function setSignRawHashProvider(fn: SignRawHashFn) {
  _signRawHash = fn;
}

export async function signHashViaPrivy(
  address: string,
  hashHex: `0x${string}`,
): Promise<`0x${string}`> {
  if (!_signRawHash) {
    throw new Error('Privy signer não inicializado. Faça login novamente.');
  }
  const { signature } = await _signRawHash({
    address,
    chainType: 'stellar',
    hash: hashHex,
  });
  return signature;
}
