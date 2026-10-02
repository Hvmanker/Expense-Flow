export function normalizeMerchant(rawMerchant: string): string {
  if (!rawMerchant) return 'Unknown Merchant';

  let cleaned = rawMerchant
    .replace(/^VPA\s+/i, '')
    .replace(/@\w+/g, '') // remove UPI handles like @upi, @okaxis
    .replace(/\*+/g, ' ')
    .replace(/IN$/i, '')
    .replace(/\b(Pvt|Ltd|Inc|Co|Corp)\b/gi, '')
    .trim();

  // Capitalize words
  cleaned = cleaned
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return cleaned || 'Unknown Merchant';
}
