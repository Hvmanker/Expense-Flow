import { IBankParser, ParsedTransactionResult } from '../types.js';
import { normalizeMerchant } from '../normalizer.js';

export class SBIParser implements IBankParser {
  bankName = 'SBI';

  match(text: string, sender?: string): boolean {
    if (sender && /SBIBNK|SBI/i.test(sender)) return true;
    return /SBI|State Bank/i.test(text);
  }

  parse(text: string, timestamp?: string): ParsedTransactionResult | null {
    const amountMatch = text.match(/(?:Rs\.?|INR)\s*([\d,]+\.?\d*)/i);
    if (!amountMatch) return null;

    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    let merchant = 'Unknown';

    const trfMatch = text.match(/trf to\s+([^\s]+)/i);
    if (trfMatch) {
      merchant = normalizeMerchant(trfMatch[1]);
    }

    const refMatch = text.match(/ref\s*(\d+)/i);

    return {
      bank: this.bankName,
      amount,
      merchant,
      paymentMethod: 'UPI',
      reference: refMatch ? refMatch[1] : undefined,
      occurredAt: timestamp || new Date().toISOString(),
      rawText: text,
      confidenceScore: 0.85,
    };
  }
}
