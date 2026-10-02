import { describe, it, expect } from 'vitest';
import { ParserEngine } from '../engine.js';
import { generateFingerprint } from '../fingerprint.js';
import { resolveCanonicalMerchant } from '../merchant-resolution.js';

describe('ParserEngine Unit Tests', () => {
  const engine = new ParserEngine();

  it('should correctly parse HDFC UPI bank SMS', () => {
    const sms = 'Sent Rs. 450.00 from HDFC Bank A/C *4092 to VPA starbucks@upi on 26-AUG-26 ref 4231908123';
    const result = engine.parse(sms, 'HDFCBK');

    expect(result).not.toBeNull();
    expect(result?.bank).toBe('HDFC');
    expect(result?.amount).toBe(450);
    expect(result?.merchant).toBe('Starbucks');
    expect(result?.paymentMethod).toBe('UPI');
    expect(result?.reference).toBe('4231908123');
  });

  it('should correctly parse ICICI bank SMS', () => {
    const sms = 'Rs 1,200.00 debited from ICICI Bank A/C *1092; info: SWIGGY*BANGALORE IN. Ref 987123';
    const result = engine.parse(sms, 'ICICIB');

    expect(result).not.toBeNull();
    expect(result?.bank).toBe('ICICI');
    expect(result?.amount).toBe(1200);
    expect(result?.merchant).toBe('Swiggy Bangalore');
  });

  it('should generate deterministic SHA-256 fingerprint', () => {
    const fp1 = generateFingerprint({
      amount: 450,
      merchant: 'Starbucks',
      reference: '4231908123',
      occurredAt: '2026-08-26T12:00:00.000Z',
      paymentMethod: 'UPI',
    });

    const fp2 = generateFingerprint({
      amount: 450,
      merchant: 'STARBUCKS',
      reference: '4231908123',
      occurredAt: '2026-08-26T14:30:00.000Z', // Same day
      paymentMethod: 'UPI',
    });

    expect(fp1).toBe(fp2);
  });

  it('should resolve canonical merchant names and default categories', () => {
    const res1 = resolveCanonicalMerchant('ZEPTO MARKETPLACE PRIVATE');
    expect(res1.canonicalName).toBe('Zepto');
    expect(res1.category).toBe('Food & Dining');

    const res2 = resolveCanonicalMerchant('AMAZON PAY INDIA');
    expect(res2.canonicalName).toBe('Amazon Pay');
    expect(res2.category).toBe('Financial Services');
  });
});
