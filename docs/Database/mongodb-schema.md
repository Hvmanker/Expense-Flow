# MongoDB Database Schema Specification

## Database Engine
* **Database:** MongoDB 7.0+
* **ODM:** Mongoose 8.0+
* **Primary Key Strategy:** MongoDB ObjectId (`_id`) mapped to string `id` in DTOs.

---

## Collections & Schemas

### 1. `users` Collection
Stores user identity, OAuth credentials, and settings.
```typescript
interface IUser {
  _id: ObjectId;
  email: string; // Unique index
  name: string;
  avatarUrl?: string;
  appleId?: string; // Sparse unique index
  googleId?: string; // Sparse unique index
  passwordHash?: string;
  currency: string; // e.g., "INR"
  locale: string;   // e.g., "en-IN"
  timezone: string; // e.g., "Asia/Kolkata"
  createdAt: Date;
  updatedAt: Date;
}
```
**Indexes:**
* `email`: `{ unique: true }`
* `appleId`: `{ unique: true, sparse: true }`
* `googleId`: `{ unique: true, sparse: true }`

---

### 2. `transactions` Collection
Enterprise financial transaction entity containing complete lifecycle details.
```typescript
interface ITransaction {
  _id: ObjectId;
  userId: ObjectId; // Ref: User
  fingerprint: string; // Unique SHA-256 index
  amount: number;
  currency: string;
  merchant: string; // Normalized merchant name
  merchantId?: ObjectId; // Ref: Merchant
  bank: string; // e.g., "HDFC", "ICICI", "SBI"
  paymentMethod: 'UPI' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'NET_BANKING' | 'WALLET' | 'CASH';
  accountMasked?: string; // e.g., "**4092"
  reference?: string; // Bank RRN / Txn ID
  occurredAt: Date;
  timezone: string;
  
  // Categorization & User Enrichment
  category?: string; // Main Category Name
  subcategory?: string;
  purpose?: string; // Short 3-5 word user note
  notes?: string;
  tags: string[]; // e.g., ["reimbursable", "vacation"]
  
  // AI Attributes
  aiSuggestion?: {
    category: string;
    subcategory?: string;
    purpose?: string;
    confidence: number;
    reasoning?: string;
  };
  aiConfidence?: number;
  
  // Status Flags
  status: 'PENDING_APPROVAL' | 'CONFIRMED' | 'IGNORED' | 'FLAGGED';
  syncStatus: 'SYNCED' | 'PENDING';
  
  // Metadata & Audit
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```
**Compound Indexes:**
* `{ userId: 1, fingerprint: 1 }`: `{ unique: true }` (Guarantees transaction uniqueness per user)
* `{ userId: 1, occurredAt: -1, status: 1 }`: Optimized for Inbox & Timeline queries.
* `{ userId: 1, category: 1, occurredAt: -1 }`: Optimized for Category Analytics.
* `{ userId: 1, merchant: 1 }`: Optimized for Merchant spend rollups.

---

### 3. `transaction_events` Collection
Immutable event log for event-driven processing and auditability.
```typescript
interface ITransactionEvent {
  _id: ObjectId;
  transactionId: ObjectId;
  userId: ObjectId;
  eventType: 'TransactionCreated' | 'TransactionUpdated' | 'PurposeAssigned' | 'MerchantLearned' | 'BudgetExceeded';
  payload: Record<string, any>;
  timestamp: Date;
}
```
**Indexes:**
* `{ transactionId: 1, timestamp: -1 }`
* `{ userId: 1, eventType: 1, timestamp: -1 }`

---

### 4. `merchants` Collection
Merchant Intelligence Memory storing default categories and user feedback confidence.
```typescript
interface IMerchant {
  _id: ObjectId;
  userId: ObjectId;
  rawName: string; // e.g., "SWIGGY*BANGALORE IN"
  normalizedName: string; // e.g., "Swiggy"
  defaultCategory: string;
  defaultSubcategory?: string;
  preferredTags: string[];
  totalSpend: number;
  transactionCount: number;
  confidenceScore: number; // 0.0 to 1.0 based on user confirmation frequency
  lastSpentAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```
**Indexes:**
* `{ userId: 1, normalizedName: 1 }`: `{ unique: true }`

---

### 5. `categories` Collection
Nested hierarchical category taxonomy.
```typescript
interface ICategory {
  _id: ObjectId;
  userId?: ObjectId; // System default if undefined, custom user category if populated
  name: string;
  parentId?: ObjectId; // Null for root category
  icon: string; // Lucide icon identifier
  color: string; // Hex color string
  budgetMappingId?: ObjectId;
  isSystem: boolean;
  order: number;
}
```
**Indexes:**
* `{ userId: 1, parentId: 1, name: 1 }`

---

### 6. `budgets` Collection
Spending thresholds and period tracking.
```typescript
interface IBudget {
  _id: ObjectId;
  userId: ObjectId;
  name: string;
  amount: number;
  period: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  categoryIds: ObjectId[];
  merchantIds?: ObjectId[];
  alertThreshold: number; // e.g. 0.8 (80%)
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```
**Indexes:**
* `{ userId: 1, isActive: 1, period: 1 }`

---

### 7. `subscriptions` Collection
Detected recurring payments and subscriptions.
```typescript
interface ISubscription {
  _id: ObjectId;
  userId: ObjectId;
  merchantName: string;
  amount: number;
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  lastBillingDate: Date;
  nextBillingDate: Date;
  status: 'ACTIVE' | 'CANCELLED' | 'PAUSED';
  detectedByAI: boolean;
}
```

---

### 8. `device_tokens` Collection
Apple Shortcuts API authorization keys and Expo Push notification tokens.
```typescript
interface IDeviceToken {
  _id: ObjectId;
  userId: ObjectId;
  deviceToken: string; // Encrypted secret token for Apple Shortcuts
  expoPushToken?: string; // Expo push notification token
  deviceName: string;
  platform: 'ios' | 'android' | 'web';
  lastActiveAt: Date;
  createdAt: Date;
}
```
**Indexes:**
* `{ deviceToken: 1 }`: `{ unique: true }`
