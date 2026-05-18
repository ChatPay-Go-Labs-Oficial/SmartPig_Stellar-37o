import axios from 'axios';

const HORIZON_URL = 'https://horizon-testnet.stellar.org';

export interface AccountBalance {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
}

export interface HorizonAccount {
  balances: AccountBalance[];
}

export async function getAccountBalances(walletAddress: string): Promise<AccountBalance[]> {
  const { data } = await axios.get<HorizonAccount>(`${HORIZON_URL}/accounts/${walletAddress}`);
  return data.balances;
}

export function findUsdcBalance(balances: AccountBalance[]): number {
  const usdc = balances.find(
    (b) => b.asset_code === 'USDC',
  );
  return usdc ? parseFloat(usdc.balance) : 0;
}
