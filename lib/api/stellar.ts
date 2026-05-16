import axios from 'axios';

const isTestnet = (process.env.EXPO_PUBLIC_STELLAR_NETWORK_PASSPHRASE ?? '').includes('Test');
const HORIZON_URL = isTestnet
  ? 'https://horizon-testnet.stellar.org'
  : 'https://horizon.stellar.org';

export interface HorizonBalance {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
}

export const StellarApi = {
  getAccountBalances: (address: string): Promise<HorizonBalance[]> =>
    axios
      .get<{ balances: HorizonBalance[] }>(`${HORIZON_URL}/accounts/${address}`)
      .then((r) => r.data.balances),
};
