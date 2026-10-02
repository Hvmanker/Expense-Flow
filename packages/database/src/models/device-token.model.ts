import { Schema, model, Document, Types } from 'mongoose';

export interface IDeviceTokenDocument extends Document {
  userId: Types.ObjectId;
  deviceToken: string;
  expoPushToken?: string;
  deviceName: string;
  platform: 'ios' | 'android' | 'web';
  lastActiveAt: Date;
  createdAt: Date;
}

const DeviceTokenSchema = new Schema<IDeviceTokenDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    deviceToken: { type: String, required: true, unique: true, index: true },
    expoPushToken: { type: String },
    deviceName: { type: String, required: true },
    platform: { type: String, enum: ['ios', 'android', 'web'], required: true },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const DeviceTokenModel = model<IDeviceTokenDocument>('DeviceToken', DeviceTokenSchema, 'device_tokens');
