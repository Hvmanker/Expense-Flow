import jwt from 'jsonwebtoken';
import { UserModel, DeviceTokenModel } from '@expenseflow/database';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_jwt_access_key_change_in_production_32bytes';

export class AuthService {
  async registerOrLogin(email: string, name: string) {
    let user = await UserModel.findOne({ email });
    if (!user) {
      user = await UserModel.create({
        email,
        name,
        currency: 'INR',
      });
    }

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, role: 'USER' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        currency: user.currency,
      },
    };
  }

  async registerDeviceToken(userId: string, deviceTokenStr: string, deviceName: string) {
    const record = await DeviceTokenModel.findOneAndUpdate(
      { deviceToken: deviceTokenStr },
      {
        userId,
        deviceToken: deviceTokenStr,
        deviceName,
        platform: 'ios',
        lastActiveAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return record;
  }
}
