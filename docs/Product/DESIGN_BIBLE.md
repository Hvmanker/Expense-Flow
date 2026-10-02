---
title: "UI / UX Design Bible"
version: "1.1.0"
status: "APPROVED"
last_updated: "2026-08-29"
author: "Antigravity UI/UX Team"
---

# UI / UX Design Bible

## 1. Overview
The UI / UX Design Bible is the single source of truth for the ExpenseFlow AI interface across mobile (Expo React Native) and web (Next.js App Router). It adheres strictly to Apple's Human Interface Guidelines (HIG), enforcing a dark-mode first aesthetic, clean typography, standardized component APIs, and 4 mandatory UI state variants for every screen.

---

## 2. Scope
* **Included in V1.1:** Apple HIG Design Tokens, Motion Presets, HIG Accessibility Guidelines, Expo Router Navigation Map, Component Catalog (8 reusable components), Dashboard Widget Individual Specifications (6 Widgets), Inbox Gesture Matrix & Bottom Sheet Category Picker, Field-by-Field Transaction Details Specification, Search Filter & Sort Matrix, 11 Mobile Screen Specifications (with Loading, Empty, Error, Offline states), Settings Sections, Timeline Specs, Merchant Normalization Table, and Responsive Web Dashboard layouts.
* **Excluded in V1.1:** Custom theme builders, light mode forced override, complex chart customization.

---

## 3. Responsibilities
* **Design System (`@expenseflow/shared-ui`):** Exports dark-theme color tokens, spacing scales, and typography hierarchies.
* **Mobile App (`apps/mobile`):** Implements Reanimated spring animations, Expo Haptics, and responsive screen layouts.

---

## 4. Theme & Design System Tokens

### Color Palette (Dark-Mode First)
* **Background Primary:** `#000000` (Pure Pitch Black)
* **Card Surface / Elevated:** `#1C1C1E` (Dark Charcoal)
* **Card Surface Secondary:** `#2C2C2E` (Medium Charcoal)
* **Primary Accent:** `#007AFF` (Apple System Blue)
* **Success Green:** `#34C759` (Apple System Green)
* **Warning Orange:** `#FF9500` (Apple System Orange)
* **Danger Red:** `#FF3B30` (Apple System Red)
* **Text Primary:** `#FFFFFF` (Pure White, 100% opacity)
* **Text Secondary:** `#8E8E93` (System Muted Grey, 60% opacity)

### Typography Scale
* **Large Title:** 34pt Bold, line-height 41pt
* **Title 1:** 28pt Bold, line-height 34pt
* **Title 2:** 22pt Bold, line-height 28pt
* **Title 3:** 20pt Semi-Bold, line-height 25pt
* **Headline:** 17pt Semi-Bold, line-height 22pt
* **Body:** 17pt Regular, line-height 22pt
* **Callout:** 16pt Regular, line-height 21pt
* **Subhead:** 15pt Regular, line-height 20pt
* **Footnote:** 13pt Regular, line-height 18pt
* **Caption:** 12pt Regular, line-height 16pt

### Spacing & Radius
* **Spacing Scale:** `xs` (4dp), `sm` (8dp), `md` (16dp), `lg` (24dp), `xl` (32dp)
* **Border Radii:** `sm` (8dp), `md` (12dp), `lg` (16dp), `full` (9999dp)

### Haptic Feedback Rules
* **Selection Change:** `Haptics.selectionAsync()` on tab switches and picker rolls.
* **Button Tap:** `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` on button presses.
* **Success Action:** `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)` on transaction confirmation.
* **Destructive Action:** `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)` on delete.

---

## 5. Reanimated Motion Tokens & Animation Presets

```typescript
import { WithSpringConfig, Easing } from 'react-native-reanimated';

export const ANIMATION_TOKENS = {
  // Spring Presets
  SPRING_BOUNCY: { damping: 12, mass: 1, stiffness: 180 } as WithSpringConfig,
  SPRING_SMOOTH: { damping: 20, mass: 1, stiffness: 220 } as WithSpringConfig,
  SPRING_SNAPPY: { damping: 15, mass: 0.8, stiffness: 300 } as WithSpringConfig,

  // Timing Presets
  DURATION_FAST: 150,  // Button tap, chip selection
  DURATION_NORMAL: 250, // Modal slide-up, card expansion
  DURATION_SLOW: 400,   // Full screen transition

  // Easing Curves
  EASING_STANDARD: Easing.bezier(0.25, 0.1, 0.25, 1),
  EASING_IN_OUT: Easing.bezier(0.42, 0, 0.58, 1),
};
```

---

## 6. Accessibility Audit & Guidelines (HIG Compliant)
* **Dynamic Type:** All text components scale dynamically based on iOS font size preferences (`allowFontScaling={true}`).
* **VoiceOver Accessibility Labels:** Every interactive card and button includes explicit `accessibilityLabel` and `accessibilityHint` props (e.g. `accessibilityLabel="Starbucks payment 450 rupees"`).
* **Minimum Touch Targets:** All touchable targets adhere to a minimum sizing of **44 × 44 pt**.
* **Contrast Ratios:** Text primary (`#FFFFFF`) against card surface (`#1C1C1E`) achieves a **WCAG AAA contrast ratio of 15.8:1**.
* **Reduced Motion:** Respects `AccessibilityInfo.isReduceMotionEnabled()`. When enabled, slide-up animations collapse to simple 150ms opacity cross-fades.
* **Screen Reader Labels:** All reusable components export descriptive accessibility traits (`accessibilityRole="button"`, `accessibilityRole="header"`).

---

## 7. Dashboard Widget Individual Specifications (6 Widgets)

### Widget 1: Monthly Spend Card
* **Purpose:** Highlights total spend amount for the current month and confirmed payment count.
* **Data Source:** MongoDB `/analytics/summary` (Online) / SQLite `local_transactions` (Offline).
* **API Dependency:** `GET /api/v1/analytics/summary`.
* **SQLite Dependency:** `SELECT SUM(amount) FROM local_transactions WHERE status='COMPLETED' AND occurred_at >= startOfMonth`.
* **Loading State:** Skeleton shimmer card placeholder.
* **Empty State:** Shows `₹0.00` with "No confirmed payments this month."
* **Error State:** Displays "Unable to load spend summary." + Retry button.
* **Offline State:** Displays cached monthly total with subtle `[Offline]` badge.
* **User Interaction:** Tapping card navigates directly to Analytics tab.

### Widget 2: Pending Inbox Banner
* **Purpose:** Prominently alerts user if captured SMS transactions are awaiting category review.
* **Data Source:** SQLite `local_transactions` (`status = 'PENDING_CATEGORY'`).
* **API Dependency:** None (Pure local count).
* **SQLite Dependency:** `SELECT COUNT(*) FROM local_transactions WHERE status='PENDING_CATEGORY'`.
* **Loading State:** Hidden during boot.
* **Empty State:** Hidden completely when pending count is 0.
* **Error State:** Hidden if database query fails.
* **Offline State:** Operates 100% offline.
* **User Interaction:** Tapping banner navigates directly to Inbox tab.

### Widget 3: Budget Progress Ring Widget
* **Purpose:** Circular percentage ring showing spending against top category budget limit.
* **Data Source:** SQLite `local_categories` JOIN `local_transactions`.
* **API Dependency:** `GET /api/v1/budgets`.
* **SQLite Dependency:** Local budget query.
* **Loading State:** Circular skeleton shimmer.
* **Empty State:** Displays "No active budget. Tap to set up."
* **Error State:** Displays warning ring with error text.
* **Offline State:** Computes progress using local SQLite transaction records.
* **User Interaction:** Tapping ring navigates directly to Budgets tab.

### Widget 4: Recent Transactions Stream Widget
* **Purpose:** Vertical list displaying the 5 most recent payments.
* **Data Source:** SQLite `local_transactions` (`ORDER BY occurred_at DESC LIMIT 5`).
* **API Dependency:** `GET /api/v1/transactions?limit=5`.
* **SQLite Dependency:** `SELECT * FROM local_transactions ORDER BY occurred_at DESC LIMIT 5`.
* **Loading State:** 5 vertical skeleton shimmer rows.
* **Empty State:** Displays "No payments recorded yet."
* **Error State:** Displays "Failed to fetch recent payments."
* **Offline State:** Displays 5 most recent cached SQLite transactions.
* **User Interaction:** Tapping any transaction item opens `transaction/[id].tsx` modal.

### Widget 5: Spending Insight Card Widget
* **Purpose:** Displays AI-generated spending insights (e.g., "Food spend is 14% higher than last week").
* **Data Source:** Local analytics comparison logic.
* **Loading State:** Single skeleton line.
* **Empty State:** Hidden if insufficient historical data exists ($< 7\text{ days}$).
* **User Interaction:** Tapping card opens Analytics detail screen.

### Widget 6: Floating Action Button (`FAB`)
* **Purpose:** Primary bottom-right action button (`+`) for instant manual expense entry.
* **Loading / Empty / Error / Offline:** Always visible and 100% functional offline.
* **User Interaction:** Tapping opens `add-expense.tsx` modal.

---

## 8. Inbox Gestures & Bottom Sheet Category Picker

### Inbox Swipe Decision Rules

| User Gesture | Visual Feedback | Resulting Action | Transaction `status` Transition |
| :--- | :--- | :--- | :--- |
| **Right Swipe** | Green Card Background + Checkmark Icon | Confirm AI Category & Purpose | `PENDING_CATEGORY` $\rightarrow$ `COMPLETED` |
| **Left Swipe** | Red Card Background + Eye-Off Icon | Ignore & Dismiss Expense | `PENDING_CATEGORY` $\rightarrow$ `IGNORED` |
| **Tap Card** | Spring scale down to 0.98x | Open Bottom Sheet Category Picker | Remains `PENDING_CATEGORY` until selected |
| **Long Press** | Context Menu Popup | Reserved for V2 Multi-select | Unchanged |

### Bottom Sheet Category Picker Specification
* **Animation:** Smooth spring slide-up using `SPRING_SMOOTH` preset (250ms).
* **Category Search Bar:** Text filter input searching category names.
* **Recent Categories:** Top row displaying 4 most recently assigned categories.
* **Confirmation Flow:** Tapping any category chip updates SQLite `local_transactions`, sets `status = 'COMPLETED'`, `sync_status = 'PENDING_UPLOAD'`, enqueues item in `pending_sync_queue`, dismisses bottom sheet, and plays `Haptics.notificationAsync(Success)`.
* **Empty State:** Displays checkmark animation when inbox count reaches 0 ("All caught up!").
* **Offline Behavior:** Works 100% offline using local SQLite database.

---

## 9. Transaction Details Screen Field Expansion (`transaction/[id].tsx`)

The Transaction Details Screen provides a comprehensive, field-by-field layout:

```text
+-------------------------------------------------------+
| [Header] Transaction Details             [Save] [Close] |
+-------------------------------------------------------+
| Sync Status Badge: [SYNCED] or [PENDING UPLOAD]       |
+-------------------------------------------------------+
| Merchant: Starbucks (Editable)                        |
| Amount: ₹450.00 (Editable)                            |
| Date & Time: Aug 28, 2026, 5:30 PM (Read-Only)        |
| Bank: HDFC Bank (Read-Only)                           |
| Payment Method: UPI (Read-Only)                       |
| Account Masked: **4092 (Read-Only)                    |
| Reference No: 4231908123 (Read-Only)                  |
+-------------------------------------------------------+
| Category: Food & Dining (Taps opens Bottom Sheet)     |
| Purpose: Client coffee meeting (Editable Text Input)  |
| Notes: Discussed Q3 budget roadmap (Editable Input)   |
| Tags: [#work, #reimbursable] (Editable Chip List)     |
+-------------------------------------------------------+
| [v] Developer Raw SMS Section (Expandable Accordion)  |
| "Sent Rs. 450.00 from HDFC Bank A/C *4092..."         |
+-------------------------------------------------------+
| [ Archive Expense ]              [ Delete Expense ]   |
+-------------------------------------------------------+
```

### Field Specifications & Rules
1. **Sync Status Badge:** Displays green `[SYNCED]` or orange `[PENDING UPLOAD]` badge based on `sync_status`.
2. **Editable Fields:** `merchant`, `amount`, `category`, `purpose`, `notes`, `tags`.
3. **Read-Only Fields:** `occurredAt`, `bank`, `paymentMethod`, `accountMasked`, `reference`.
4. **Developer Raw SMS Section:** Expandable accordion displaying unparsed SMS text.
5. **Save Flow:** Tapping "Save" updates SQLite, sets `sync_status = 'PENDING_UPLOAD'`, enqueues queue item, and closes modal.
6. **Archive / Delete Flow:** Tapping "Delete Expense" displays native action sheet confirmation ("Are you sure?"). Confirming sets `status = 'ARCHIVED'` and triggers sync.
7. **Offline Edits:** Edits executed offline update SQLite immediately and queue `UPDATE` in `pending_sync_queue`.

---

## 10. Search UX Specification (9 Filters & Sorting)

### Supported Search Filters
1. **Merchant:** Text match against `merchant` and `merchant_id`.
2. **Category:** Multi-select category taxonomy filter.
3. **Payment Method:** `UPI` | `CREDIT_CARD` | `DEBIT_CARD` | `NET_BANKING` | `CASH`.
4. **Bank:** `HDFC` | `ICICI` | `SBI` | `AXIS` | `KOTAK` | `GENERIC`.
5. **Amount Range:** Min amount ($\text{₹}$) and Max amount ($\text{₹}$).
6. **Date Range:** Start Date $\rightarrow$ End Date picker.
7. **Notes:** Full-text search over transaction `notes` and `purpose`.
8. **Status:** `PENDING_CATEGORY` | `COMPLETED` | `IGNORED` | `ARCHIVED`.
9. **Tags:** Filter by tag string array (`#work`, `#reimbursable`).

### Sorting Options
* **Date (Newest First):** `occurredAt DESC` (Default)
* **Date (Oldest First):** `occurredAt ASC`
* **Amount (Highest First):** `amount DESC`
* **Amount (Lowest First):** `amount ASC`
* **V2 Natural Language Search Placeholder:** Search bar displays prompt: *"Search expenses (V2 Natural Language query placeholder)..."*.

---

## 11. Mobile Screen Specifications (11 Screens with 4 State Variants)

### Screen 1: Splash Screen
* *Loading:* Centered ExpenseFlow AI logo with subtle pulsing glow.
* *Empty / Success:* Immediate navigation to Home or Login.
* *Error:* Red alert text: "Retry App Initialization".
* *Offline:* Boots instantly using local SQLite cache.

### Screen 2: Login Screen
* *Loading:* Spinner on Apple Sign-In button.
* *Empty:* Clean form input with OAuth action buttons.
* *Error:* "Authentication failed. Check network or credentials."
* *Offline:* Banner: "Offline Mode — Cached session active."

### Screen 3: Home Dashboard Screen
* *Loading:* Animated skeleton shimmer cards for monthly spend and recent payments.
* *Empty:* "No payments captured yet. Set up Apple Shortcuts to start automatic tracking."
* *Error:* "Unable to load dashboard metrics." + Retry button.
* *Offline:* Top banner: "Offline Mode — Rendering cached data".

### Screen 4: Inbox Screen (Pending Approvals)
* *Loading:* Skeleton cards.
* *Empty:* Checkmark animation: "All caught up! No pending transactions."
* *Error:* "Failed to load pending inbox."
* *Offline:* Renders pending transactions directly from SQLite local database.

### Screen 5: Transaction Details Screen
* *Loading:* Skeleton form lines.
* *Empty / N/A:* Valid transaction record always present.
* *Error:* "Transaction not found."
* *Offline:* Edit allowed; changes queued in SQLite `pending_sync_queue`.

### Screen 6: Add Manual Expense Screen
* *Loading:* Disabled submit button with spinner.
* *Empty:* Clean form fields initialized with current date and time.
* *Error:* Red inline input validation warnings.
* *Offline:* Full functionality available; enqueues mutation in SQLite.

### Screen 7: Timeline Screen
* *Loading:* Skeleton day rows.
* *Empty:* "No transactions recorded for this selected date."
* *Error:* "Failed to load timeline feed."
* *Offline:* Renders full historical timeline from local SQLite storage.

### Screen 8: Analytics Screen
* *Loading:* Skeleton chart circles and bar placeholders.
* *Empty:* "Not enough spending data to generate analytics charts."
* *Error:* "Failed to compute analytics."
* *Offline:* Computes analytics using local SQLite transaction records.

### Screen 9: Budgets Screen
* *Loading:* Skeleton progress bars.
* *Empty:* "No active budgets configured. Tap + to create your first budget."
* *Error:* "Failed to load budget progress."
* *Offline:* Renders progress calculated from local SQLite transactions.

### Screen 10: Search Screen
* *Loading:* Spinner below search input.
* *Empty:* "No payments match your search criteria."
* *Error:* "Search query failed."
* *Offline:* Filters local SQLite database instantly.

### Screen 11: Settings Screen
* *Loading:* Skeleton settings rows.
* *Empty:* Displays Device Secret Token with copy button.
* *Error:* "Unable to load settings."
* *Offline:* Full access to token copy and local preferences.

---

## 12. Responsive Web Dashboard Layouts
* **Dashboard (`/`):** 3-column top widget grid (Total Spend, Pending Inbox Count, AI Confidence) above recent transaction stream table.
* **Analytics (`/analytics`):** 2-column layout with Category Donut breakdown chart on left and Merchant Leaderboard table on right.
* **Transactions (`/transactions`):** Full-width data table with multi-select bulk categorization, search bar, and CSV export.

---

## 13. Acceptance Criteria

### Feature Completion Checklist
- [x] Design tokens, Reanimated animation presets, and HIG accessibility audit defined.
- [x] Individual widget specifications for 6 Dashboard widgets provided.
- [x] Inbox swipe gesture decision matrix & bottom sheet category picker detailed.
- [x] Field-by-field Transaction Details Screen specification documented.
- [x] Search filter & sort matrix (9 filters) specified.
- [x] All 11 mobile screens documented with 4 mandatory state variants (Loading, Empty, Error, Offline).

---

## 14. Future Improvements (V2 Upgrade Path)
* **Light Theme Support:** Automatic OS light/dark mode switching.
* **Custom Color Themes:** User-selectable accent colors (Indigo, Emerald, Crimson).
