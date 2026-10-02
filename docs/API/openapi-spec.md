# OpenAPI 3.0 Specification & API Contracts

## Base URLs
* **Production:** `https://api.expenseflow.ai/api/v1`
* **Development:** `http://localhost:4000/api/v1`

---

## Authentication Endpoints (`/auth`)

### 1. Apple Sign-In
`POST /auth/apple`
* **Request:**
```json
{
  "identityToken": "eyJhbGciOiJSUzI1NiIs...",
  "user": {
    "name": { "firstName": "John", "lastName": "Doe" },
    "email": "john.doe@privaterelay.appleid.com"
  }
}
```
* **Response 200 OK:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "d8a1f9e2...",
  "user": {
    "id": "65d8a9f0e1...",
    "email": "john.doe@privaterelay.appleid.com",
    "name": "John Doe",
    "currency": "INR"
  }
}
```

---

## Capture Endpoints (`/capture`)

### 1. SMS Payload Ingestion (Apple Shortcuts)
`POST /capture/sms`
* **Headers:**
  - `Content-Type: application/json`
  - `X-Device-Token: <ENCRYPTED_DEVICE_TOKEN>`
* **Request Payload:**
```json
{
  "rawText": "Sent Rs. 450.00 from HDFC Bank A/C *4092 to VPA starbucks@upi on 26-AUG-26 ref 4231908123.",
  "sender": "HDFCBK",
  "timestamp": "2026-08-26T12:00:00.000Z",
  "bankHint": "HDFC",
  "source": "APPLE_SHORTCUTS"
}
```
* **Response 201 Created:**
```json
{
  "success": true,
  "transaction": {
    "id": "tx_65d8b1e42...",
    "fingerprint": "a9f8c12b7...",
    "amount": 450.00,
    "merchant": "Starbucks",
    "bank": "HDFC",
    "paymentMethod": "UPI",
    "reference": "4231908123",
    "occurredAt": "2026-08-26T12:00:00.000Z",
    "status": "PENDING_APPROVAL",
    "aiSuggestion": {
      "category": "Food & Dining",
      "purpose": "Coffee at Starbucks",
      "confidence": 0.95
    }
  }
}
```

---

## Transactions Endpoints (`/transactions`)

### 1. List Transactions
`GET /transactions?status=PENDING_APPROVAL&limit=20&page=1`
* **Response 200 OK:**
```json
{
  "data": [
    {
      "id": "tx_65d8b1e42...",
      "amount": 450.00,
      "merchant": "Starbucks",
      "bank": "HDFC",
      "paymentMethod": "UPI",
      "status": "PENDING_APPROVAL",
      "occurredAt": "2026-08-26T12:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

### 2. Confirm / Assign Purpose
`PATCH /transactions/:id/confirm`
* **Request:**
```json
{
  "category": "Food & Dining",
  "subcategory": "Coffee & Snacks",
  "purpose": "Client coffee meeting",
  "notes": "Discussed Q3 strategy",
  "tags": ["work", "reimbursable"]
}
```
* **Response 200 OK:**
```json
{
  "success": true,
  "transaction": {
    "id": "tx_65d8b1e42...",
    "status": "CONFIRMED",
    "updatedAt": "2026-08-26T12:05:00.000Z"
  }
}
```

---

## Sync Endpoints (`/sync`)

### 1. Delta Sync Push
`POST /sync/push`
* **Request:**
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
        "purpose": "Client coffee meeting"
      },
      "clientTimestamp": "2026-08-26T12:05:00.000Z"
    }
  ]
}
```
* **Response 200 OK:**
```json
{
  "syncedIds": ["q_987123"],
  "conflicts": []
}
```

### 2. Delta Sync Pull
`POST /sync/pull`
* **Request:**
```json
{
  "lastSyncTimestamp": "2026-08-26T10:00:00.000Z"
}
```
* **Response 200 OK:**
```json
{
  "transactions": [...],
  "categories": [...],
  "merchants": [...],
  "serverTimestamp": "2026-08-26T12:06:00.000Z"
}
```
