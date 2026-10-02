import { Schema, model, Document } from 'mongoose';

export interface IUserDocument extends Document {
  email: string;
  name: string;
  avatarUrl?: string;
  appleId?: string;
  googleId?: string;
  currency: string;
  locale: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    avatarUrl: { type: String },
    appleId: { type: String, unique: true, sparse: true },
    googleId: { type: String, unique: true, sparse: true },
    currency: { type: String, default: 'INR' },
    locale: { type: String, default: 'en-IN' },
    timezone: { type: String, default: 'Asia/Kolkata' },
  },
  { timestamps: true }
);

export const UserModel = model<IUserDocument>('User', UserSchema);
