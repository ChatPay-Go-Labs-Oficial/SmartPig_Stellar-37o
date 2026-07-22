import { apiClient } from './client';

export type GiftStatus =
  | 'CREATED'
  | 'FUNDED'
  | 'CLAIMING'
  | 'CLAIMED'
  | 'EXPIRED'
  | 'REFUNDED';

export interface Gift {
  id: string;
  senderUserId: string;
  recipientUserId: string | null;
  amount: string;
  assetSymbol: string;
  status: GiftStatus;
  expiresAt: string;
  claimTxHash: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Response of POST /gifts — includes the share code and funding data. */
export interface CreatedGift extends Gift {
  code: string;
  memo: string;
  claimAgentAddress: string;
}

/** Items of GET /gifts — code/balanceId only present on sent gifts. */
export interface GiftListItem extends Gift {
  code: string | null;
  balanceId: string | null;
  direction: 'sent' | 'received';
}

/** Public preview of GET /gifts/:code. */
export interface GiftPreview {
  amount: string;
  assetSymbol: string;
  status: GiftStatus;
  expiresAt: string;
  senderName: string | null;
}

export interface CreateGiftParams {
  idempotencyKey: string;
  userId: string;
  walletAccountId: string;
  amount: string;
}

export interface ClaimGiftParams {
  code: string;
  userId: string;
  walletAccountId: string;
  stellarAddress: string;
}

export const createGift = async (params: CreateGiftParams): Promise<CreatedGift> => {
  const { data } = await apiClient.post('/gifts', params);
  return data;
};

export const getGiftPreview = async (code: string): Promise<GiftPreview> => {
  const { data } = await apiClient.get(`/gifts/${encodeURIComponent(code)}`);
  return data;
};

export const claimGift = async ({ code, ...body }: ClaimGiftParams): Promise<Gift> => {
  const { data } = await apiClient.post(`/gifts/${encodeURIComponent(code)}/claim`, body);
  return data;
};

export const listGifts = async (userId: string): Promise<GiftListItem[]> => {
  const { data } = await apiClient.get('/gifts', { params: { userId } });
  return data;
};

export interface GiftEligibility {
  canGift: boolean;
}

export const getGiftEligibility = async (userId: string): Promise<GiftEligibility> => {
  const { data } = await apiClient.get('/gifts/eligibility', { params: { userId } });
  return data;
};
