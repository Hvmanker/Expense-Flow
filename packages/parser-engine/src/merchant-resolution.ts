export interface CanonicalMerchantMatch {
  canonicalName: string;
  category: string;
  confidence: number;
}

const CANONICAL_RULES: { pattern: RegExp; canonicalName: string; category: string }[] = [
  { pattern: /SWIGGY/i, canonicalName: 'Swiggy', category: 'Food & Dining' },
  { pattern: /ZOMATO/i, canonicalName: 'Zomato', category: 'Food & Dining' },
  { pattern: /ZEPTO/i, canonicalName: 'Zepto', category: 'Food & Dining' },
  { pattern: /BLINKIT|GROFERS/i, canonicalName: 'Blinkit', category: 'Food & Dining' },
  { pattern: /STARBUCKS/i, canonicalName: 'Starbucks', category: 'Food & Dining' },
  { pattern: /AMAZON PAY/i, canonicalName: 'Amazon Pay', category: 'Financial Services' },
  { pattern: /AMAZON/i, canonicalName: 'Amazon', category: 'Shopping' },
  { pattern: /FLIPKART/i, canonicalName: 'Flipkart', category: 'Shopping' },
  { pattern: /UBER/i, canonicalName: 'Uber', category: 'Transportation' },
  { pattern: /OLA/i, canonicalName: 'Ola', category: 'Transportation' },
  { pattern: /NETFLIX/i, canonicalName: 'Netflix', category: 'Entertainment' },
  { pattern: /SPOTIFY/i, canonicalName: 'Spotify', category: 'Entertainment' },
];

export function resolveCanonicalMerchant(rawMerchant: string): CanonicalMerchantMatch {
  for (const rule of CANONICAL_RULES) {
    if (rule.pattern.test(rawMerchant)) {
      return {
        canonicalName: rule.canonicalName,
        category: rule.category,
        confidence: 0.95,
      };
    }
  }

  return {
    canonicalName: rawMerchant,
    category: 'Miscellaneous',
    confidence: 0.5,
  };
}
