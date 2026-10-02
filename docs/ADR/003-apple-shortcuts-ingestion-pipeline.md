# ADR-003: Apple Shortcuts Ingestion Pipeline

## Status
Approved

## Context
Capturing payments in real-time on iOS presents significant platform limitations:
1. iOS App Sandbox prevents background applications from directly inspecting or intercepting device SMS messages for privacy reasons.
2. Android allows `RECEIVE_SMS` permissions, but iOS is our primary target platform for ExpenseFlow AI.
3. Users do not want to manually copy-paste or screenshot SMS notifications after every transaction.

## Decision
We architect an automated SMS capture pipeline leveraging **Native Apple Shortcuts Automations**:

### iOS Platform Mechanics
* Apple Shortcuts natively includes an automation trigger: **"When I receive a Message containing [Keyword]"**.
* Keywords supported: `spent`, `debited`, `Sent Rs`, `credited`, `withdrawn`, `UPI txn`, `VPA`.
* When an SMS matching any keyword arrives, Apple Shortcuts executes an automated workflow in the background.

### Shortcut Execution Steps
1. Shortcut extracts: `ShortcutInput` (SMS body), `Sender` (bank shortcode e.g. `HDFCBK`), and `Current Date` (Timestamp).
2. Shortcut runs a lightweight regular expression module to extract coarse transaction variables:
   - `amount`: Cleaned numerical value.
   - `merchant`: Extracted string after `at`, `to`, `vpa`, `info`.
   - `reference`: RRN / Transaction ID.
   - `paymentMethod`: `UPI`, `Credit Card`, `Debit Card`, `ATM`.
3. Shortcut makes an HTTP POST request to ExpenseFlow AI Backend Endpoint: `https://api.expenseflow.ai/api/v1/capture/sms`.
4. Header includes per-device authentication token: `X-Device-Token: <SECURE_DEVICE_TOKEN>`.
5. In case of network failure, Apple Shortcuts queues native retries or saves failed payloads to local Files app storage for retry upon network reconnection.

### Network Architecture Diagram
```mermaid
flowchart TD
    A[Bank SMS Sent] --> B[iOS SMS App Receives SMS]
    B -->|Trigger Keyword Match| C[Apple Shortcuts Automation]
    C --> D[Extract SMS Body, Sender, Timestamp]
    D --> E{Network Available?}
    E -- Yes --> F[HTTP POST /api/v1/capture/sms]
    E -- No --> G[Store in iOS Shortcuts Queue]
    G -->|Network Restored| F
    F --> H[ExpenseFlow API Webhook]
    H --> I[Validate Device Token]
    I --> J[@expenseflow/parser-engine]
    J --> K[Duplicate Detection Engine]
    K --> L[Save Pending Transaction in MongoDB]
    L --> M[Push Expo Notification to Mobile App]
```

## Security & Privacy Considerations
* **Authentication:** Device Tokens are cryptographically generated UUIDv4 tokens tied to a specific user account and encrypted in `Expo SecureStore`.
* **Payload Encryption:** HTTPS strictly enforced with SSL pin verification in client applications.
* **Non-Financial Filtering:** Apple Shortcuts automation filters SMS before sending payload to ensure non-transactional personal SMS messages are never transmitted.

## Consequences
### Positive
* **Zero User Friction:** Automatic background capture without launching app or taking screenshots.
* **Real-time Processing:** Transactions land in the Inbox within 2-5 seconds of payment completion.
* **Battery & Performance Efficient:** Native iOS Shortcuts handling avoids background daemon battery drain.

### Negative
* **Initial User Setup:** User must run a one-time guided 60-second Apple Shortcut installation wizard during onboarding.
* **OS Dependency:** Future iOS updates to Shortcuts triggers require monitoring and maintenance.
