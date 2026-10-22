import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

export interface FingerprintInput {
  amount: number;
  merchant: string;
  reference?: string;
  occurredAt: string; // ISO string
  paymentMethod: string;
}

export function generateFingerprint(input: FingerprintInput): string {
  const dateObj = new Date(input.occurredAt);
  const dateDay = dateObj.toISOString().slice(0, 10); // YYYY-MM-DD
  const normalizedMerchant = input.merchant.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  const rawString = `${input.amount}_${normalizedMerchant}_${input.reference || 'NOREFF'}_${dateDay}_${input.paymentMethod}`;
  return bytesToHex(sha256(new TextEncoder().encode(rawString)));
}
