import mongoose from 'mongoose';
import { DeviceTokenModel, UserModel } from '@expenseflow/database';

async function seed() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/expenseflow';
  await mongoose.connect(MONGODB_URI);

  let user = await UserModel.findOne({ email: 'himank@expenseflow.ai' });
  if (!user) {
    user = await UserModel.create({
      email: 'himank@expenseflow.ai',
      name: 'Himank Verma',
      currency: 'INR',
    });
  }

  await DeviceTokenModel.findOneAndUpdate(
    { deviceToken: 'test-device-token-123' },
    {
      userId: user._id,
      deviceToken: 'test-device-token-123',
      deviceName: "Himank's iPhone 15 Pro",
      platform: 'ios',
    },
    { upsert: true, new: true }
  );

  console.log('Successfully seeded test device token: test-device-token-123 for user:', user.name);
  await mongoose.disconnect();
}

seed().catch(console.error);
