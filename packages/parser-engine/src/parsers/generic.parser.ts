import { IBankParser, ParsedTransactionResult } from '../types.js';
import { normalizeMerchant } from '../normalizer.js';

export class GenericFallbackParser implements IBankParser {
  bankName = 'Generic';

  match(_text: string, _sender?: string): boolean {
    return true; // Always matches as fallback
  }

  parse(text: string, timestamp?: string): ParsedTransactionResult | null {
    const amountMatch = text.match(/(?:Rs\.?|INR)\s*([\d,]+\.?\d*)/i);
    if (!amountMatch) return null;

    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    let merchant = 'Unknown Merchant';

    const atMatch = text.match(/(?:at|to)\s+([A-Z0-9\s\*]+?)(?=\son|\sref|\.|$)/i);
    if (atMatch) {
      merchant = normalizeMerchant(atMatch[1]);
    }

    return {
      bank: 'Generic',
      amount,
      merchant,
      paymentMethod: /UPI/i.test(text) ? 'UPI' : 'CREDIT_CARD',
      occurredAt: timestamp || new Date().toISOString(),
      rawText: text,
      confidenceScore: 0.6,
    };
  }
}
