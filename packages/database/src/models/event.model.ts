import { Schema, model, Document, Types } from 'mongoose';

export interface ITransactionEventDocument extends Document {
  transactionId?: Types.ObjectId;
  userId: Types.ObjectId;
  eventType: string;
  payload: Record<string, any>;
  timestamp: Date;
}

const TransactionEventSchema = new Schema<ITransactionEventDocument>({
  transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction' },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  eventType: { type: String, required: true, index: true },
  payload: { type: Schema.Types.Mixed, required: true },
  timestamp: { type: Date, default: Date.now, index: true },
});

export const TransactionEventModel = model<ITransactionEventDocument>(
  'TransactionEvent',
  TransactionEventSchema,
  'transaction_events'
);
