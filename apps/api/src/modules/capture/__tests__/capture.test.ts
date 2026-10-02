import { describe, it, expect } from 'vitest';
import { ParserEngine, generateFingerprint } from '@expenseflow/parser-engine';

describe('Capture Module Unit Verification', () => {
  const parserEngine = new ParserEngine();

  it('should parse SMS and generate correct fingerprint', () => {
    const rawText = 'Sent Rs. 450.00 from HDFC Bank A/C *4092 to VPA starbucks@upi on 26-AUG-26 ref 4231908123';
    const parsed = parserEngine.parse(rawText, 'HDFCBK');

    expect(parsed).not.toBeNull();
    expect(parsed?.amount).toBe(450);
    expect(parsed?.merchant).toBe('Starbucks');
    expect(parsed?.bank).toBe('HDFC');

    const fingerprint = generateFingerprint({
      amount: parsed!.amount,
      merchant: parsed!.merchant,
      reference: parsed!.reference,
      occurredAt: parsed!.occurredAt,
      paymentMethod: parsed!.paymentMethod,
    });

    expect(fingerprint).toHaveLength(64); // SHA-256 hex string length
  });
});
