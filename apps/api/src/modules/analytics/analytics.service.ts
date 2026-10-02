import { TransactionModel } from '@expenseflow/database';
import { Types } from 'mongoose';

export class AnalyticsService {
  async getSummary(userId: string) {
    const userObjectId = new Types.ObjectId(userId);
    const filter = { userId: userObjectId };

    // 1. Total Spend (Confirmed transactions for this user)
    const confirmedAgg = await TransactionModel.aggregate([
      { $match: { ...filter, status: 'CONFIRMED' } },
      { $group: { _id: null, totalSpend: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    const totalSpend = confirmedAgg[0]?.totalSpend || 0;
    const confirmedCount = confirmedAgg[0]?.count || 0;

    // 2. Pending Inbox Items Count for this user
    const pendingCount = await TransactionModel.countDocuments({ ...filter, status: 'PENDING_APPROVAL' });

    // 3. AI Average Confidence Score for this user
    const aiAgg = await TransactionModel.aggregate([
      { $match: { ...filter, aiConfidence: { $ne: null } } },
      { $group: { _id: null, avgConfidence: { $avg: '$aiConfidence' } } },
    ]);

    const avgConfidence = aiAgg[0]?.avgConfidence ? Math.round(aiAgg[0].avgConfidence * 100) : 94.5;

    return {
      totalSpend,
      confirmedCount,
      pendingCount,
      avgConfidence,
    };
  }
}
