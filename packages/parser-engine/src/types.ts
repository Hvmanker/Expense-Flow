import { PaymentMethod } from '@expenseflow/shared-types';

export interface ParsedTransactionResult {
  bank: string;
  amount: number;
  merchant: string;
  paymentMethod: PaymentMethod;
  accountMasked?: string;
  reference?: string;
  occurredAt: string;
  rawText: string;
  confidenceScore: number;
}

export interface IBankParser {
  bankName: string;
  match(text: string, sender?: string): boolean;
  parse(text: string, timestamp?: string): ParsedTransactionResult | null;
}
