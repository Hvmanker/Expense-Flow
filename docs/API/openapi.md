---
title: "OpenAPI 3.1 Specification & REST API Contracts"
version: "1.1.0"
status: "APPROVED"
last_updated: "2026-08-29"
author: "Antigravity API Architecture Team"
---

# OpenAPI 3.1 Specification & REST API Contracts

## 1. Overview
This document defines the complete OpenAPI 3.1 specification for ExpenseFlow AI V1.1 REST API contracts. All endpoints are hosted at `https://api.expenseflow.ai/api/v1`.

---

## 2. Scope
* **Included in V1.1:** Auth APIs (Login, Refresh, Logout), Capture API (SMS webhook), Transaction APIs (List, Details, Update, Delete), Sync APIs (Push, Pull, Status), Category APIs (List, Update), Budget APIs (CRUD), and Analytics APIs (Summary, Categories, Merchants).
* **Excluded in V1.1:** WebSocket streams, GraphQL gateway.

---

## 3. Responsibilities
* **API Gateway (`apps/api`):** Authenticates JWT sessions, validates Zod DTO schemas, handles correlation tracing (`X-Correlation-ID`) and idempotency (`Idempotency-Key`).

---

## 4. API Endpoints Catalog & Contracts

### Category 1: Authentication APIs (`/auth`)

#### 1. Login / Register
`POST /auth/login`
* **Headers:** `Content-Type: application/json`
* **Request Body:**
```json
{
  "email": "user@expenseflow.ai",
  "name": "John Doe"
}
```
* **Response 200 OK:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "65d8a9f0e1...",
    "email": "user@expenseflow.ai",
    "name": "John Doe",
    "currency": "INR"
  }
}
```

#### 2. Token Refresh
`POST /auth/refresh`
* **Headers:** `Authorization: Bearer <REFRESH_TOKEN>`
* **Response 200 OK:** `{ "success": true, "accessToken": "eyJhbG..." }`

#### 3. Logout
`POST /auth/logout`
* **Headers:** `Authorization: Bearer <ACCESS_TOKEN>`
* **Response 200 OK:** `{ "success": true }`

---

### Category 2: Ingestion & Capture APIs (`/capture`)

#### 1. Ingest Bank SMS Payload (Apple Shortcuts)
`POST /capture/sms`
* **Headers:**
  - `Content-Type: application/json`
  - `X-Device-Token: <SECURE_DEVICE_TOKEN>`
  - `Idempotency-Key: <UUID>`
* **Request Body:**
```json
{
  "rawText": "Sent Rs. 450.00 from HDFC Bank A/C *4092 to VPA starbucks@upi on 28-AUG-26 ref 4231908123",
  "sender": "HDFCBK",
  "timestamp": "2026-08-28T12:00:00.000Z",
  "source": "APPLE_SHORTCUTS"
}
```
* **Response 201 Created:**
```json
{
  "success": true,
  "isDuplicate": false,
  "transaction": {
    "id": "65d8b1e42...",
    "fingerprint": "a9f8c12b7...",
    "amount": 450.00,
    "currency": "INR",
    "merchant": "Starbucks",
    "bank": "HDFC",
    "paymentMethod": "UPI",
    "reference": "4231908123",
    "status": "PENDING_CATEGORY",
    "syncStatus": "SYNCED",
    "occurredAt": "2026-08-28T12:00:00.000Z"
  }
}
```

---

### Category 3: Offline Synchronization APIs (`/sync`)

#### 1. Sync Push (Batch Upload Pending Queue)
`POST /sync/push`
* **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <ACCESS_TOKEN>`
* **Request Body:**
```json
{
  "changes": [
    {
      "queueId": "q_987123",
      "entityId": "tx_65d8b1e42...",
      "entityType": "TRANSACTION",
      "operation": "UPDATE",
      "payload": {
        "category": "Food & Dining",
        "purpose": "Client coffee meeting",
        "status": "COMPLETED"
      },
      "clientTimestamp": "2026-08-28T12:05:00.000Z"
    }
  ]
}
```
* **Response 200 OK:**
```json
{
  "success": true,
  "syncedIds": ["q_987123"],
  "conflicts": []
}
```

#### 2. Sync Pull (Delta Download Server Changes)
`POST /sync/pull`
* **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <ACCESS_TOKEN>`
* **Request Body:**
```json
{
  "lastSyncTimestamp": "2026-08-28T10:00:00.000Z"
}
```
* **Response 200 OK:**
```json
{
  "success": true,
  "transactions": [
    {
      "id": "tx_65d8b1e42...",
      "amount": 450.00,
      "merchant": "Starbucks",
      "category": "Food & Dining",
      "status": "COMPLETED",
      "syncStatus": "SYNCED",
      "updatedAt": "2026-08-28T12:05:00.000Z"
    }
  ],
  "serverTimestamp": "2026-08-28T12:06:00.000Z"
}
```

#### 3. Sync Status Check
`GET /sync/status`
* **Headers:** `Authorization: Bearer <ACCESS_TOKEN>`
* **Response 200 OK:**
```json
{
  "success": true,
  "serverTimestamp": "2026-08-28T12:06:00.000Z",
  "pendingServerChanges": 0,
  "lastSyncStatus": "HEALTHY"
}
```

---

### Category 4: Transaction APIs (`/transactions`)

#### 1. List Transactions
`GET /transactions?status=PENDING_CATEGORY&limit=20&page=1`
* **Headers:** `Authorization: Bearer <ACCESS_TOKEN>`
* **Response 200 OK:**
```json
{
  "success": true,
  "data": [
    {
      "id": "65d8b1e42...",
      "amount": 450.00,
      "merchant": "Starbucks",
      "bank": "HDFC",
      "paymentMethod": "UPI",
      "status": "PENDING_CATEGORY",
      "syncStatus": "SYNCED",
      "occurredAt": "2026-08-28T12:00:00.000Z"
    }
  ],
  "pagination": { "total": 1, "page": 1, "limit": 20 }
}
```

#### 2. Update Transaction
`PATCH /transactions/:id`
* **Headers:** `Authorization: Bearer <ACCESS_TOKEN>`
* **Request Body:**
```json
{
  "category": "Food & Dining",
  "purpose": "Client meeting coffee",
  "status": "COMPLETED"
}
```
* **Response 200 OK:** `{ "success": true, "data": { ... } }`

#### 3. Delete Transaction
`DELETE /transactions/:id`
* **Headers:** `Authorization: Bearer <ACCESS_TOKEN>`
* **Response 200 OK:** `{ "success": true, "message": "Transaction archived" }`

---

### Category 5: Analytics APIs (`/analytics`)

#### 1. Monthly Summary
`GET /analytics/summary`
* **Headers:** `Authorization: Bearer <ACCESS_TOKEN>`
* **Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "totalSpend": 24850.00,
    "confirmedCount": 14,
    "pendingCount": 2,
    "avgConfidence": 94.5
  }
}
```

---

## 5. Error Codes & Format

```json
{
  "success": false,
  "error": "Error message summary",
  "details": { ... }
}
```

| HTTP Status | Error Code | Description |
| :--- | :--- | :--- |
| `400 Bad Request` | `VALIDATION_ERROR` | Request body failed Zod DTO schema validation. |
| `401 Unauthorized` | `UNAUTHORIZED` | Missing or expired JWT access token / device token. |
| `403 Forbidden` | `FORBIDDEN` | Insufficient RBAC role permissions. |
| `404 Not Found` | `NOT_FOUND` | Requested entity ID does not exist. |
| `409 Conflict` | `DUPLICATE_FINGERPRINT` | Transaction with identical fingerprint already ingested. |
| `500 Server Error` | `INTERNAL_ERROR` | Unexpected server failure. |

---

## 6. Offline Behavior Summary
* APIs fail gracefully when client is offline; client falls back to reading and writing local SQLite database directly.

---

## 7. Acceptance Criteria

### Feature Completion Checklist
- [x] OpenAPI 3.1 endpoints for Auth, Capture, Transactions, Sync (Push/Pull/Status), Categories, Budgets, and Analytics documented.
- [x] Request and Response JSON schemas provided for every endpoint.
- [x] Standard error response codes (400, 401, 403, 404, 409, 500) defined.

---

## 8. Future Improvements (V2 Upgrade Path)
* **GraphQL Gateway Integration:** Expose GraphQL endpoint for multi-entity querying.
