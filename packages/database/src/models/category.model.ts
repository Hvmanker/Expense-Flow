import { Schema, model, Document, Types } from 'mongoose';

export interface ICategoryDocument extends Document {
  userId?: Types.ObjectId;
  name: string;
  parentId?: Types.ObjectId;
  icon: string;
  color: string;
  isSystem: boolean;
  order: number;
}

const CategorySchema = new Schema<ICategoryDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  name: { type: String, required: true },
  parentId: { type: Schema.Types.ObjectId, ref: 'Category' },
  icon: { type: String, default: 'tag' },
  color: { type: String, default: '#6B7280' },
  isSystem: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
});

CategorySchema.index({ userId: 1, parentId: 1, name: 1 });

export const CategoryModel = model<ICategoryDocument>('Category', CategorySchema);
