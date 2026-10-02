# Testing Strategy & Quality Assurance Specification

## Overview

ExpenseFlow AI enforces a multi-tiered testing strategy across client, server, parser, and worker bounded contexts to guarantee financial accuracy and zero regressions.

---

## 1. Test Pyramid & Coverage Requirements

| Test Tier | Target Coverage | Tooling | Execution Frequency |
| :--- | :--- | :--- | :--- |
| **Unit Tests** | > 90% | Vitest | On every commit (Husky Pre-commit) |
| **Parser Engine Tests** | > 98% (SMS Fixtures) | Vitest (`packages/testing`) | CI Pipeline |
| **Integration Tests** | > 85% | Supertest + Testcontainers (Mongo/Redis) | Pull Request CI |
| **E2E Mobile Tests** | Core User Journeys | Detox / Expo Mobile | Pre-Release Build |
| **E2E Web Tests** | Inbox & Dashboard | Playwright | Pre-Release Build |

---

## 2. SMS Parser Fixture Testing Strategy (`packages/testing`)

To test `@expenseflow/parser-engine`, real-world bank SMS strings across all major Indian financial institutions are curated in `packages/testing/src/fixtures/sms.fixtures.ts`:

```typescript
export interface SMSFixture {
  bank: string;
  rawSMS: string;
  expectedAmount: number;
  expectedMerchant: string;
  expectedPaymentMethod: string;
  expectedReference?: string;
}

export const SMS_FIXTURES: SMSFixture[] = [
  {
    bank: 'HDFC',
    rawSMS: 'Sent Rs. 450.00 from HDFC Bank A/C *4092 to VPA starbucks@upi on 26-AUG-26 ref 4231908123',
    expectedAmount: 450,
    expectedMerchant: 'Starbucks',
    expectedPaymentMethod: 'UPI',
    expectedReference: '4231908123',
  },
  {
    bank: 'ICICI',
    rawSMS: 'Rs 1,200.00 debited from ICICI Bank A/C *1092; info: SWIGGY*BANGALORE IN. Ref 987123',
    expectedAmount: 1200,
    expectedMerchant: 'Swiggy Bangalore',
    expectedPaymentMethod: 'DEBIT_CARD',
    expectedReference: '987123',
  },
];
```

---

## 3. Idempotency & Conflict Resolution Testing

Specific integration tests verify:
* **Duplicate SMS Ingestion:** Injecting identical SMS webhooks produces single transaction record.
* **Offline Sync Re-connection:** Simulating offline SQLite mutations followed by batch push verifies Last-Write-Wins merging logic.
* **AI Prompt Schema Compliance:** Verifying Ollama Qwen2.5:14B output matches Zod DTO schema.
