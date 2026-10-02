import { IBankParser, ParsedTransactionResult } from './types.js';
import { HDFCParser } from './parsers/hdfc.parser.js';
import { ICICIParser } from './parsers/icici.parser.js';
import { SBIParser } from './parsers/sbi.parser.js';
import { GenericFallbackParser } from './parsers/generic.parser.js';

export class ParserEngine {
  private parsers: IBankParser[] = [
    new HDFCParser(),
    new ICICIParser(),
    new SBIParser(),
    new GenericFallbackParser(),
  ];

  parse(text: string, sender?: string, timestamp?: string): ParsedTransactionResult | null {
    for (const parser of this.parsers) {
      if (parser.match(text, sender)) {
        const result = parser.parse(text, timestamp);
        if (result) return result;
      }
    }
    return null;
  }
}

const defaultEngine = new ParserEngine();

export function parseSMS(text: string, sender?: string, timestamp?: string): ParsedTransactionResult | null {
  return defaultEngine.parse(text, sender, timestamp);
}
