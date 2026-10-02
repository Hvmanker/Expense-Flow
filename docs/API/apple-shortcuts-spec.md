# Apple Shortcuts Ingestion Specification & Setup Guide

## iOS Background Processing Mechanics

Due to Apple iOS Sandbox security rules, third-party apps cannot run background SMS listeners directly. 

ExpenseFlow AI uses native **Apple Shortcuts Automation Triggers**. When a bank sends a transaction alert SMS, iOS native Shortcuts intercepts the message and executes a background POST request to the ExpenseFlow AI API endpoint.

---

## Supported Keyword Triggers

The Apple Shortcut automation must be configured to trigger on SMS containing any of the following regex keywords:

| Keyword / Pattern | Sample Match String | Bank / Payment Service |
| :--- | :--- | :--- |
| `spent` | "Rs 450.00 spent on HDFC Bank Card" | HDFC, ICICI, Axis |
| `debited` | "A/C *4092 debited for Rs 1,200.00" | SBI, IDFC, Kotak |
| `Sent Rs` | "Sent Rs. 500.00 to Swiggy" | Google Pay, PhonePe, Paytm |
| `credited` | "A/C *4092 credited with Rs 50,000.00" | Salary / Refunds |
| `withdrawn` | "Rs 2,000.00 withdrawn from ATM" | Cash ATM Withdrawal |
| `UPI txn` | "UPI txn Rs 150.00 to Tea Stall" | BHIM / Bank UPI |

---

## iOS Shortcut Setup Workflow

1. Open **Shortcuts App** on iPhone -> Select **Automation** tab -> Tap **+**.
2. Select **Message**.
3. Set Trigger Conditions:
   - **Sender:** Leave blank (matches any sender) OR add shortcodes (`HDFCBK`, `ICICIB`, `SBIBNK`, `AXISBK`, `KOTAKB`).
   - **Message Contains:** `spent` (Create identical automations for `debited`, `Sent Rs`, `credited`).
   - **Run Immediately:** Enabled.
   - **Notify When Run:** Disabled (for zero-interruption background operation).
4. Add Action 1: **Get Contents of URL**:
   - **URL:** `https://api.expenseflow.ai/api/v1/capture/sms`
   - **Method:** `POST`
   - **Headers:**
     - `Content-Type`: `application/json`
     - `X-Device-Token`: `[Your ExpenseFlow Secret Token from Settings]`
   - **Request Body (JSON):**
     - `rawText`: `Shortcut Input` (SMS Text)
     - `sender`: `Sender`
     - `timestamp`: `Current Date` (ISO Format)
     - `source`: `"APPLE_SHORTCUTS"`
5. Add Action 2: **If HTTP Status != 200/201 (Offline Fallback)**:
   - Action: **Open URL**: `expenseflow://capture?rawText=[Shortcut Input]&sender=[Sender]&timestamp=[Current Date]`

---

## Offline Capture Deep Link Architecture (`expenseflow://capture`)

If the iPhone lacks cellular/Wi-Fi signal when an SMS arrives:
1. The Apple Shortcut Action POST request fails.
2. The Shortcut executes the fallback action: **Open URL `expenseflow://capture?...`**.
3. The ExpenseFlow Mobile App intercepts the deep link URL.
4. The app parses the SMS text locally using `@expenseflow/parser-engine`.
5. The transaction is inserted into SQLite:
   - `status = 'PENDING_CATEGORY'`
   - `sync_status = 'PENDING_UPLOAD'`
6. A `CREATE` operation is pushed to `pending_sync_queue`.
7. When cellular connectivity returns, the Background Sync Manager uploads the queued payload to MongoDB automatically.
