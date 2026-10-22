import {
  TransactionDTO,
  SMSIngestionPayload,
  SyncQueueItem,
} from '@expenseflow/shared-types';

export interface ExpenseFlowSDKConfig {
  baseUrl: string;
  deviceToken?: string;
  authToken?: string;
}

export class ExpenseFlowSDK {
  constructor(private config: ExpenseFlowSDKConfig) {}

  setAuthToken(token: string): void {
    this.config.authToken = token;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`;
    }
    if (this.config.deviceToken) {
      headers['X-Device-Token'] = this.config.deviceToken;
    }
    return headers;
  }

  async captureSMS(payload: SMSIngestionPayload): Promise<{ transaction: TransactionDTO; isDuplicate: boolean }> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/capture/sms`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to capture SMS');
    }

    return res.json();
  }

  async pushSync(changes: SyncQueueItem[]): Promise<{ syncedIds: string[]; conflicts: any[] }> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/sync/push`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ changes }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to push sync changes');
    }

    return res.json();
  }

  async pullSync(lastSyncTimestamp?: string): Promise<{ transactions: any[]; timestamp: string }> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/sync/pull`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ lastSyncTimestamp }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to pull sync updates');
    }

    return res.json();
  }

  async sendMagicLink(email: string): Promise<{ success: boolean; message: string; devOtp?: string }> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/auth/magic-link/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to send magic link');
    }

    return res.json();
  }

  async verifyMagicLink(email: string, code: string): Promise<{ success: boolean; token: string; user: any }> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/auth/magic-link/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to verify magic link code');
    }

    const data = await res.json();
    if (data.token) {
      this.setAuthToken(data.token);
    }
    return data;
  }
}
