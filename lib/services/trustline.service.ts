import { Account, Asset, Networks, Operation, TransactionBuilder, xdr } from '@stellar/stellar-base';
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
    const { data } = await axios.get<{ balances: any[] }>(`${HORIZON_URL}/accounts/${stellarAddress}`);
    return (data.balances ?? []).some(
      (b) => b.asset_code === 'USDC' && b.asset_issuer === USDC_ISSUER,
    );
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
    } catch (parseErr: any) {
      if (parseErr.message?.includes('assinaturas')) throw parseErr;
      // If we can't parse the XDR, let Horizon reject it with proper result_codes.
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
