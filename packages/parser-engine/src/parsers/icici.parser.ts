import { IBankParser, ParsedTransactionResult } from '../types.js';
import { normalizeMerchant } from '../normalizer.js';

export class ICICIParser implements IBankParser {
  bankName = 'ICICI';

  match(text: string, sender?: string): boolean {
    if (sender && /ICICIB/i.test(sender)) return true;
    return /ICICI Bank|ICICI/i.test(text);
  }

  parse(text: string, timestamp?: string): ParsedTransactionResult | null {
    const amountMatch = text.match(/(?:Rs\.?|INR)\s*([\d,]+\.?\d*)/i);
    if (!amountMatch) return null;

    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    let merchant = 'Unknown';

    const infoMatch = text.match(/info:\s*([^\.]+)/i);
    if (infoMatch) {
      merchant = normalizeMerchant(infoMatch[1]);
    }

    const refMatch = text.match(/(?:Ref|RRN)\s*(\d+)/i);

    return {
      bank: this.bankName,
      amount,
      merchant,
      paymentMethod: /UPI/i.test(text) ? 'UPI' : 'DEBIT_CARD',
      reference: refMatch ? refMatch[1] : undefined,
      occurredAt: timestamp || new Date().toISOString(),
      rawText: text,
      confidenceScore: 0.88,
    };
  }
}
