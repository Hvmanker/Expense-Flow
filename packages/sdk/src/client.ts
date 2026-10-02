import { TransactionDTO, SMSIngestionPayload } from '@expenseflow/shared-types';

export interface ExpenseFlowSDKConfig {
  baseUrl: string;
  deviceToken?: string;
  authToken?: string;
}

export class ExpenseFlowSDK {
  constructor(private config: ExpenseFlowSDKConfig) {}

  async captureSMS(payload: SMSIngestionPayload): Promise<{ transaction: TransactionDTO; isDuplicate: boolean }> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/capture/sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Token': this.config.deviceToken || '',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to capture SMS');
    }

    return res.json();
  }
}
