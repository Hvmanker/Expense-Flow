# System Architecture Specification

## Architectural Overview

ExpenseFlow AI is designed as an **Offline-First Event-Driven Modular Monolith** structured within a Turborepo monorepo. It cleanly segregates client applications (Expo React Native Mobile, Next.js Web Dashboard), core backend domain contexts (Express API), domain background workers (AI, Analytics, Notifications, Sync), and reusable packages.

```mermaid
graph TD
    subgraph Clients["Client Layer"]
        iOS[iOS Mobile App - Expo Router]
        Android[Android Mobile App - Expo Router]
        Web[Web Dashboard - Next.js App Router]
        Shortcuts[Apple Shortcuts Automation]
    end

    subgraph API_Layer["API Gateway / Backend Layer"]
        Express[Node.js Express Modular Monolith API]
        AuthGuard[JWT / Device Token Auth]
        ParserPkg["@expenseflow/parser-engine"]
        ZodVal[Zod DTO Validator]
    end

    subgraph Background_Layer["Asynchronous Worker Services"]
        BullMQ[BullMQ Redis Queues]
        AIWorker[ai-worker Ollama Qwen2.5:14B]
        AnalyticsWorker[analytics-worker Rollup Engine]
        SyncWorker[sync-worker Delta Sync Engine]
        NotifWorker[notification-worker Expo Push]
    end

    subgraph Data_Layer["Storage & Memory Layer"]
        Mongo[(MongoDB Primary Storage)]
        Redis[(Redis Cache & Queue Store)]
        SQLite[(Mobile Client SQLite Cache)]
        Ollama[(Ollama LLM & Vector Store)]
    end

    Shortcuts -->|HTTPS /api/v1/capture/sms| Express
    iOS <-->|REST + Sync API| Express
    Android <-->|REST + Sync API| Express
    Web <-->|REST API| Express

    iOS --- SQLite
    Android --- SQLite

    Express --> AuthGuard
    AuthGuard --> ZodVal
    ZodVal --> ParserPkg
    Express --> Mongo
    Express --> BullMQ

    BullMQ --> Redis
    BullMQ --> AIWorker
    BullMQ --> AnalyticsWorker
    BullMQ --> SyncWorker
    BullMQ --> NotifWorker

    AIWorker --> Ollama
    AIWorker --> Mongo
    AnalyticsWorker --> Mongo
    SyncWorker --> Mongo
```

---

## Bounded Context Boundaries

Each domain bounded context manages its own models, repositories, business services, controllers, DTOs, events, and unit tests:

| Bounded Context | Responsibilities | Key Dependencies | Primary Models |
| :--- | :--- | :--- | :--- |
| **Capture Context** | Ingestion of raw SMS payloads via Apple Shortcuts, raw parsing, bank identification | `@expenseflow/parser-engine`, Zod | `transaction_events`, `audit_logs` |
| **Transactions Context** | Core transaction lifecycle, fingerprinting, Inbox pending approvals, state transitions | `@expenseflow/database`, Zod | `transactions`, `transaction_events` |
| **Categories Context** | Nested category taxonomy management, color/icon assignments, budget mappings | `@expenseflow/database` | `categories` |
| **Merchants Context** | Merchant intelligence memory, string normalization, confidence scores | `@expenseflow/database` | `merchants` |
| **AI Context** | Ollama Qwen2.5:14B prompt generation, embedding vectors, natural language chat | Ollama REST, LangChain, BullMQ | `ai_memory`, `merchants` |
| **Analytics Context** | Aggregated spend rollups (daily, weekly, monthly, category, merchant, time of day) | MongoDB Aggregation Pipelines | `transactions`, `categories` |
| **Budgets Context** | Spending limit calculations, rollover logic, overspending alerts | Redis, BullMQ | `budgets`, `transactions` |
| **Notifications Context**| Deep-linked Expo push notifications, 9 PM daily digest scheduling | Expo Push SDK, Scheduler | `notifications`, `device_tokens` |
| **Sync Context** | Delta sync payload processing, LWW conflict resolution, SQLite reconciliation | SQLite DTOs, Mongoose Sessions | `sync_state`, `transactions` |
| **Users & Auth Context**| JWT generation/rotation, OAuth (Apple/Google), device token authorization | bcrypt, jsonwebtoken, Expo SecureStore | `users`, `device_tokens` |

---

## High Availability & Resilience Principles

1. **Graceful Degradation:** If Ollama AI is offline, transaction categorization falls back to `@expenseflow/parser-engine` rule-based heuristics and Merchant Memory without breaking HTTP ingestion.
2. **Idempotent Ingestion:** Every incoming SMS payload is assigned a deterministic SHA-256 fingerprint generated from `(amount + merchant + reference + date_day + payment_method)`. Duplicate webhooks return HTTP 200 with the existing transaction object.
3. **Event-Driven Decoupling:** Heavy side-effects (vector embeddings, analytics rollups, budget threshold evaluations) are pushed to BullMQ queues and executed asynchronously outside the API request-response lifecycle.
