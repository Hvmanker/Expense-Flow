'use client';

import React, { useEffect, useState } from 'react';

interface AnalyticsSummary {
  totalSpend: number;
  confirmedCount: number;
  pendingCount: number;
  avgConfidence: number;
}

export default function WebDashboardHome() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('himank@expenseflow.ai');

  useEffect(() => {
    // 1. Login to obtain JWT Session
    fetch('http://localhost:4000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, name: 'Himank Verma' }),
    })
      .then((res) => res.json())
      .then((authResult) => {
        if (!authResult.success || !authResult.token) {
          throw new Error('Authentication failed');
        }

        // 2. Fetch User-Scoped Analytics using Bearer JWT Token
        return fetch('http://localhost:4000/api/v1/analytics/summary', {
          headers: {
            Authorization: `Bearer ${authResult.token}`,
          },
        });
      })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setData(json.data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch authenticated metrics:', err);
        setLoading(false);
      });
  }, [userEmail]);

  return (
    <div style={{ padding: 40, maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: 40, borderBottom: '1px solid #2C2C2E', paddingBottom: 20 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0 }}>ExpenseFlow AI Dashboard</h1>
        <p style={{ color: '#8E8E93', marginTop: 8 }}>Authenticated Session: {userEmail} (RBAC Scoped)</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 40 }}>
        <div style={{ backgroundColor: '#1C1C1E', padding: 24, borderRadius: 16 }}>
          <div style={{ color: '#8E8E93', fontSize: 13, textTransform: 'uppercase' }}>Monthly Total Spend</div>
          <div style={{ fontSize: 32, fontWeight: 800, margin: '8px 0' }}>
            {loading ? '...' : `₹${(data?.totalSpend || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          </div>
          <div style={{ color: '#34C759', fontSize: 13, fontWeight: 600 }}>
            {loading ? 'Loading...' : `↑ ${data?.confirmedCount || 0} Confirmed Payments`}
          </div>
        </div>

        <div style={{ backgroundColor: '#1C1C1E', padding: 24, borderRadius: 16 }}>
          <div style={{ color: '#8E8E93', fontSize: 13, textTransform: 'uppercase' }}>Pending Inbox Items</div>
          <div style={{ fontSize: 32, fontWeight: 800, margin: '8px 0', color: '#FF9500' }}>
            {loading ? '...' : `${data?.pendingCount || 0} Transactions`}
          </div>
          <div style={{ color: '#007AFF', fontSize: 13, fontWeight: 600 }}>RBAC User-Scoped Transactions</div>
        </div>

        <div style={{ backgroundColor: '#1C1C1E', padding: 24, borderRadius: 16 }}>
          <div style={{ color: '#8E8E93', fontSize: 13, textTransform: 'uppercase' }}>AI Confidence Average</div>
          <div style={{ fontSize: 32, fontWeight: 800, margin: '8px 0', color: '#34C759' }}>
            {loading ? '...' : `${data?.avgConfidence || 94.5}%`}
          </div>
          <div style={{ color: '#8E8E93', fontSize: 13 }}>Ollama Qwen2.5:14B Local Model</div>
        </div>
      </div>
    </div>
  );
}
