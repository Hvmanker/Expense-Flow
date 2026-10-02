import { IBankParser, ParsedTransactionResult } from '../types.js';
import { normalizeMerchant } from '../normalizer.js';

export class HDFCParser implements IBankParser {
  bankName = 'HDFC';

  match(text: string, sender?: string): boolean {
    if (sender && /HDFCBK|HDFC/i.test(sender)) return true;
    return /HDFC Bank|HDFC/i.test(text);
  }

  parse(text: string, timestamp?: string): ParsedTransactionResult | null {
    // Regex e.g. "Sent Rs. 450.00 from HDFC Bank A/C *4092 to VPA starbucks@upi on 26-AUG-26 ref 4231908123"
    // or "Rs 1,200.00 spent on HDFC Bank Card ending 1234 at SWIGGY"
    const amountMatch = text.match(/(?:Rs\.?|INR)\s*([\d,]+\.?\d*)/i);
    if (!amountMatch) return null;

    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    let merchant = 'Unknown';
    let paymentMethod: 'UPI' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'NET_BANKING' = 'UPI';

    const vpaMatch = text.match(/to VPA\s+([^\s]+)/i);
    const atMerchantMatch = text.match(/at\s+([A-Z0-9\s\*]+?)(?=\son|\sref|\.|$)/i);

    if (vpaMatch) {
      merchant = normalizeMerchant(vpaMatch[1]);
      paymentMethod = 'UPI';
    } else if (atMerchantMatch) {
      merchant = normalizeMerchant(atMerchantMatch[1]);
      paymentMethod = /Card/i.test(text) ? 'CREDIT_CARD' : 'DEBIT_CARD';
    }

    const accountMatch = text.match(/(?:A\/C|Card)\s*(?:\*+|ending\s*)?(\d{4})/i);
    const refMatch = text.match(/ref\s*(\d+)/i);

    return {
      bank: this.bankName,
      amount,
      merchant,
      paymentMethod,
      accountMasked: accountMatch ? `**${accountMatch[1]}` : undefined,
      reference: refMatch ? refMatch[1] : undefined,
      occurredAt: timestamp || new Date().toISOString(),
      rawText: text,
      confidenceScore: 0.9,
    };
  }
}
