import { ParserEngine, generateFingerprint } from '@expenseflow/parser-engine';
import { TransactionModel, TransactionEventModel, DeviceTokenModel } from '@expenseflow/database';
import { SMSIngestionPayload, TransactionDTO } from '@expenseflow/shared-types';
import { logger } from '@expenseflow/logger';

export class CaptureService {
  private parserEngine = new ParserEngine();

  async processSMSCapture(
    deviceTokenStr: string,
    payload: SMSIngestionPayload
  ): Promise<{ transaction: TransactionDTO; isDuplicate: boolean }> {
    // 1. Authenticate Device Token
    const deviceToken = await DeviceTokenModel.findOne({ deviceToken: deviceTokenStr });
    if (!deviceToken) {
      throw new Error('UNAUTHORIZED_DEVICE_TOKEN');
    }

    const userId = deviceToken.userId;

    // 2. Parse SMS Text using Parser Engine
    const parsed = this.parserEngine.parse(payload.rawText, payload.sender, payload.timestamp);
    if (!parsed) {
      throw new Error('FAILED_TO_PARSE_SMS');
    }

    // 3. Generate Fingerprint
    const fingerprint = generateFingerprint({
      amount: parsed.amount,
      merchant: parsed.merchant,
      reference: parsed.reference,
      occurredAt: parsed.occurredAt,
      paymentMethod: parsed.paymentMethod,
    });

    // 4. Check for Duplicate Transaction
    const existing = await TransactionModel.findOne({ userId, fingerprint });
    if (existing) {
      logger.info({ userId, fingerprint }, 'Duplicate transaction detected via fingerprint');
      return {
        transaction: this.mapToDTO(existing),
        isDuplicate: true,
      };
    }

    // 5. Create Transaction Record
    const newTx = await TransactionModel.create({
      userId,
      fingerprint,
      amount: parsed.amount,
      currency: 'INR',
      merchant: parsed.merchant,
      bank: parsed.bank,
      paymentMethod: parsed.paymentMethod,
      reference: parsed.reference,
      accountMasked: parsed.accountMasked,
      occurredAt: new Date(parsed.occurredAt),
      status: 'PENDING_APPROVAL',
      syncStatus: 'SYNCED',
      metadata: {
        rawSMS: payload.rawText,
        confidenceScore: parsed.confidenceScore,
      },
    });

    // 6. Record Event Log
    await TransactionEventModel.create({
      transactionId: newTx._id,
      userId,
      eventType: 'TransactionCreated',
      payload: {
        fingerprint,
        amount: parsed.amount,
        merchant: parsed.merchant,
        source: payload.source,
      },
    });

    logger.info({ transactionId: newTx._id, merchant: parsed.merchant }, 'SMS Transaction created successfully');

    return {
      transaction: this.mapToDTO(newTx),
      isDuplicate: false,
    };
  }

  private mapToDTO(doc: any): TransactionDTO {
    return {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      fingerprint: doc.fingerprint,
      amount: doc.amount,
      currency: doc.currency,
      merchant: doc.merchant,
      bank: doc.bank,
      paymentMethod: doc.paymentMethod as any,
      accountMasked: doc.accountMasked,
      reference: doc.reference,
      occurredAt: doc.occurredAt.toISOString(),
      timezone: doc.timezone || 'Asia/Kolkata',
      category: doc.category,
      subcategory: doc.subcategory,
      purpose: doc.purpose,
      notes: doc.notes,
      tags: doc.tags || [],
      aiSuggestion: doc.aiSuggestion,
      aiConfidence: doc.aiConfidence,
      status: doc.status,
      syncStatus: doc.syncStatus,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }
}
