import { Schema, model, Document, Types } from 'mongoose';

export interface ITransactionDocument extends Document {
  userId: Types.ObjectId;
  fingerprint: string;
  amount: number;
  currency: string;
  merchant: string;
  merchantId?: Types.ObjectId;
  bank: string;
  paymentMethod: string;
  accountMasked?: string;
  reference?: string;
  occurredAt: Date;
  timezone: string;
  category?: string;
  subcategory?: string;
  purpose?: string;
  notes?: string;
  tags: string[];
  aiSuggestion?: {
    category: string;
    subcategory?: string;
    purpose?: string;
    confidence: number;
    reasoning?: string;
  };
  aiConfidence?: number;
  status: 'PENDING_APPROVAL' | 'CONFIRMED' | 'IGNORED' | 'FLAGGED';
  syncStatus: 'SYNCED' | 'PENDING';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransactionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fingerprint: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    merchant: { type: String, required: true },
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant' },
    bank: { type: String, required: true },
    paymentMethod: { type: String, required: true },
    accountMasked: { type: String },
    reference: { type: String },
    occurredAt: { type: Date, required: true },
    timezone: { type: String, default: 'Asia/Kolkata' },
    category: { type: String },
    subcategory: { type: String },
    purpose: { type: String },
    notes: { type: String },
    tags: { type: [String], default: [] },
    aiSuggestion: {
      category: String,
      subcategory: String,
      purpose: String,
      confidence: Number,
      reasoning: String,
    },
    aiConfidence: { type: Number },
    status: {
      type: String,
      enum: ['PENDING_APPROVAL', 'CONFIRMED', 'IGNORED', 'FLAGGED'],
      default: 'PENDING_APPROVAL',
      index: true,
    },
    syncStatus: { type: String, enum: ['SYNCED', 'PENDING'], default: 'SYNCED' },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Compound Indexes for Analytics & Ingestion
TransactionSchema.index({ userId: 1, fingerprint: 1 }, { unique: true });
TransactionSchema.index({ userId: 1, occurredAt: -1, status: 1 });
TransactionSchema.index({ userId: 1, category: 1, occurredAt: -1 });

export const TransactionModel = model<ITransactionDocument>('Transaction', TransactionSchema);
