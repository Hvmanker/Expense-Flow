export const up = async (db, client) => {
  // 1. Transaction Indexes
  const transactions = db.collection('transactions');
  await transactions.createIndex({ userId: 1, fingerprint: 1 }, { unique: true });
  await transactions.createIndex({ userId: 1, occurredAt: -1, status: 1 });
  await transactions.createIndex({ userId: 1, category: 1, occurredAt: -1 });
  await transactions.createIndex({ userId: 1, updatedAt: -1 });

  // 2. TransactionEvent Audit Log & TTL
  const events = db.collection('transaction_events');
  await events.createIndex({ userId: 1 });
  await events.createIndex({ eventType: 1 });
  await events.createIndex({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

  // 3. Merchant Normalized Index
  const merchants = db.collection('merchants');
  await merchants.createIndex({ userId: 1, normalizedName: 1 }, { unique: true });

  // 4. Device Tokens Index
  const deviceTokens = db.collection('device_tokens');
  await deviceTokens.createIndex({ deviceToken: 1 }, { unique: true });
  await deviceTokens.createIndex({ userId: 1 });

  // 5. Users Index
  const users = db.collection('users');
  await users.createIndex({ email: 1 }, { unique: true });
};

export const down = async (db, client) => {
  const transactions = db.collection('transactions');
  await transactions.dropIndex('userId_1_fingerprint_1').catch(() => {});
  await transactions.dropIndex('userId_1_occurredAt_-1_status_1').catch(() => {});
  await transactions.dropIndex('userId_1_category_1_occurredAt_-1').catch(() => {});
  await transactions.dropIndex('userId_1_updatedAt_-1').catch(() => {});

  const events = db.collection('transaction_events');
  await events.dropIndex('userId_1').catch(() => {});
  await events.dropIndex('eventType_1').catch(() => {});
  await events.dropIndex('timestamp_1').catch(() => {});

  const merchants = db.collection('merchants');
  await merchants.dropIndex('userId_1_normalizedName_1').catch(() => {});

  const deviceTokens = db.collection('device_tokens');
  await deviceTokens.dropIndex('deviceToken_1').catch(() => {});
  await deviceTokens.dropIndex('userId_1').catch(() => {});

  const users = db.collection('users');
  await users.dropIndex('email_1').catch(() => {});
};
