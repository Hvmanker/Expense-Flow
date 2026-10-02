import { Schema, model, Document, Types } from 'mongoose';

export interface IMerchantDocument extends Document {
  userId: Types.ObjectId;
  rawName: string;
  normalizedName: string;
  defaultCategory: string;
  defaultSubcategory?: string;
  preferredTags: string[];
  totalSpend: number;
  transactionCount: number;
  confidenceScore: number;
  lastSpentAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MerchantSchema = new Schema<IMerchantDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rawName: { type: String, required: true },
    normalizedName: { type: String, required: true },
    defaultCategory: { type: String, required: true },
    defaultSubcategory: { type: String },
    preferredTags: { type: [String], default: [] },
    totalSpend: { type: Number, default: 0 },
    transactionCount: { type: Number, default: 0 },
    confidenceScore: { type: Number, default: 1.0 },
    lastSpentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

MerchantSchema.index({ userId: 1, normalizedName: 1 }, { unique: true });

export const MerchantModel = model<IMerchantDocument>('Merchant', MerchantSchema);
