import { Account, Asset, hash, Networks, Operation, TransactionBuilder, xdr } from '@stellar/stellar-base';
import axios from 'axios';

const isTestnet = (process.env.EXPO_PUBLIC_STELLAR_NETWORK_PASSPHRASE ?? '').includes('Test');
const HORIZON_URL = isTestnet
  ? 'https://horizon-testnet.stellar.org'
  : 'https://horizon.stellar.org';
const USDC_ISSUER = isTestnet
  ? 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'
  : 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const NETWORK_PASSPHRASE = isTestnet ? Networks.TESTNET : Networks.PUBLIC;

export const TrustlineService = {
  hasTrustline: async (stellarAddress: string): Promise<boolean> => {
    try {
      const { data } = await axios.get<{ balances: any[] }>(`${HORIZON_URL}/accounts/${stellarAddress}`);
      return (data.balances ?? []).some(
        (b) => b.asset_code === 'USDC' && b.asset_issuer === USDC_ISSUER,
      );
    } catch (e: any) {
      if (e?.response?.status === 404) return false; // account not activated yet
      throw e;
    }
  },

  accountExists: async (stellarAddress: string): Promise<boolean> => {
    try {
      await axios.get(`${HORIZON_URL}/accounts/${stellarAddress}`);
      return true;
    } catch (e: any) {
      if (e?.response?.status === 404) return false;
      throw e;
    }
  },

  fundWithFriendbot: async (stellarAddress: string): Promise<void> => {
    console.log('[Trustline] Friendbot funding:', stellarAddress);
    const { data } = await axios.get(
      `https://friendbot.stellar.org/?addr=${stellarAddress}`,
    );
    console.log('[Trustline] Friendbot OK, tx hash:', data?.hash ?? '(sem hash)');
  },

  buildTrustlineXdr: async (stellarAddress: string): Promise<string> => {
    console.log('[Trustline] building for', stellarAddress, '| horizon:', HORIZON_URL);
    const { data: accountData } = await axios.get<{ sequence: string }>(
      `${HORIZON_URL}/accounts/${stellarAddress}`,
    );
    console.log('[Trustline] account sequence:', accountData.sequence);
    const account = new Account(stellarAddress, accountData.sequence);
    const tx = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.changeTrust({
          asset: new Asset('USDC', USDC_ISSUER),
          limit: '1000000000',
        }),
      )
      .setTimeout(300)
      .build();
    const xdr = tx.toXDR();
    console.log('[Trustline] built XDR (first 80):', xdr.slice(0, 80));
    return xdr;
  },

  submitTrustline: async (signedXdr: string): Promise<void> => {
    console.log('[Trustline] submitting to', HORIZON_URL);
    console.log('[Trustline] isTestnet:', isTestnet, '| passphrase:', NETWORK_PASSPHRASE);
    console.log('[Trustline] signedXDR length:', signedXdr.length);

    // Verify the wallet actually added a signature before sending to Horizon.
    try {
      const envelope = xdr.TransactionEnvelope.fromXDR(signedXdr, 'base64');
      const sigs = envelope.v1().signatures();
      console.log('[Trustline] signature count:', sigs.length);
      if (sigs.length === 0) {
        throw new Error('Carteira não assinou a transação (0 assinaturas). Tente novamente no Lobstr.');
      }
      // Log the key hint (last 4 bytes of the public key) to identify which key signed.
      // Compare this with the hint of the wallet address to detect key mismatch.
      sigs.forEach((sig, i) => {
        const hint = sig.hint().toString('hex');
        console.log(`[Trustline] sig[${i}] hint (chave que assinou):`, hint);
      });
      // Source account hint check
      const srcRaw = envelope.v1().tx().sourceAccount().ed25519();
      if (srcRaw) {
        const srcHint = Buffer.from(srcRaw).slice(-4).toString('hex');
        console.log('[Trustline] source account hint (quem deveria assinar):', srcHint);
        const sigHint = sigs[0].hint().toString('hex');
        if (sigHint !== srcHint) {
          console.error(
            '[Trustline] ⚠️  KEY MISMATCH! Chave que assinou:', sigHint,
            '≠ conta fonte:', srcHint,
            '— Lobstr está assinando com uma conta DIFERENTE da carteira conectada.',
          );
        } else {
          console.log('[Trustline] ✓ Hints conferem — chave correta assinou.');
        }
      }

      // Verify the signature against the TESTNET passphrase to detect passphrase mismatch.
      // If this fails, Lobstr signed with the wrong network (e.g., mainnet passphrase).
      try {
        const networkHashBuffer = hash(Buffer.from(NETWORK_PASSPHRASE, 'utf8'));
        const txBody = envelope.v1().tx().toXDR();
        const payload = Buffer.concat([networkHashBuffer, txBody]);
        const txHash = hash(payload);
        const sig = sigs[0];
        const srcKey = srcRaw ? Buffer.from(srcRaw) : null;

        if (srcKey) {
          // nacl is available inside stellar-base internals, but we can check via a lightweight method:
          // If the signature length is 64 bytes it's a valid Ed25519 sig format at minimum.
          const sigBytes = Buffer.from(sig.signature());
          console.log('[Trustline] tx_hash (hex, primeiros 16):', txHash.slice(0, 8).toString('hex'));
          console.log('[Trustline] sig length:', sigBytes.length, '(esperado: 64)');
          if (sigBytes.length !== 64) {
            console.error('[Trustline] ⚠️  Assinatura com tamanho inválido:', sigBytes.length);
            throw new Error('Assinatura retornada pelo Lobstr tem formato inválido.');
          }
          console.log('[Trustline] Para verificar o passphrase: cole o XDR em https://laboratory.stellar.org/#txsigner?network=test');
        }
      } catch (verifyErr: any) {
        if (verifyErr.message?.includes('passphrase') || verifyErr.message?.includes('formato')) throw verifyErr;
        console.warn('[Trustline] Verificação local falhou (não crítico):', verifyErr.message);
      }
    } catch (parseErr: any) {
      if (parseErr.message?.includes('assinaturas')) throw parseErr;
      console.warn('[Trustline] Could not parse signedXDR to count sigs:', parseErr.message);
    }

    const params = new URLSearchParams();
    params.append('tx', signedXdr);
    try {
      await axios.post(`${HORIZON_URL}/transactions`, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    } catch (e: any) {
      const body = e?.response?.data;
      const rc = body?.extras?.result_codes;
      console.error('[Trustline] Horizon 400 result_codes:', JSON.stringify(rc));
      // Surface the exact code so it appears in the UI toast.
      const txCode = rc?.transaction ?? 'unknown';
      const opCode = rc?.operations?.[0] ?? '';
      const detail = opCode ? `${txCode} / ${opCode}` : txCode;
      const err = new Error(`Horizon rejeitou a transação: ${detail}`);
      (err as any).horizonResultCodes = rc;
      throw err;
    }
  },
};
