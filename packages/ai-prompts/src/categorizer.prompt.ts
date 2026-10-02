export interface CategorizerPromptInput {
  rawSMS: string;
  merchant: string;
  amount: number;
  paymentMethod: string;
  bank: string;
}

export function buildCategorizerPrompt(input: CategorizerPromptInput): string {
  return `You are ExpenseFlow AI, an expert financial classifier.
Analyze the following bank transaction details and output ONLY a JSON object adhering to the specified format.

Transaction Context:
- Raw Text: "${input.rawSMS}"
- Extracted Merchant: "${input.merchant}"
- Amount: ₹${input.amount}
- Payment Method: "${input.paymentMethod}"
- Bank: "${input.bank}"

Available Main Categories:
[Food & Dining, Transportation, Shopping, Bills & Utilities, Entertainment, Health & Fitness, Travel, Financial Services, Income, Miscellaneous]

Return JSON in this exact structure:
{
  "category": "<Main Category>",
  "subcategory": "<Subcategory>",
  "suggestedPurpose": "<Short 3-5 word concise purpose>",
  "confidence": 0.95,
  "reasoning": "<1 sentence rationale>",
  "suggestedTags": ["tag1", "tag2"]
}`;
}
