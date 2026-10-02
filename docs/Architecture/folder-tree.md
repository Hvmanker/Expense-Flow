# Complete Monorepo Folder Tree & Package Responsibilities

## Directory Tree

```text
expense-tracker/
├── apps/
│   ├── mobile/                      # Expo SDK / React Native Mobile Application
│   │   ├── app/                     # Expo Router File-based Navigation
│   │   │   ├── (auth)/              # Login, Register, Onboarding
│   │   │   ├── (tabs)/              # Home, Inbox, Transactions, Analytics, Budgets, Settings
│   │   │   ├── transaction/[id].tsx # Transaction Detail & Edit Modal
│   │   │   ├── ai-assistant.tsx     # Conversational Financial Chat
│   │   │   └── _layout.tsx          # Root Layout & Provider Setup
│   │   ├── src/
│   │   │   ├── components/          # Reusable Mobile UI Components (Reanimated)
│   │   │   ├── db/                  # SQLite Migrations & Repository Classes
│   │   │   ├── hooks/               # Custom React Hooks (TanStack Query integrations)
│   │   │   ├── services/            # Background Sync Manager & Notification Handlers
│   │   │   └── store/               # Zustand Client Stores
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── web/                         # Next.js App Router Web Dashboard
│   │   ├── src/
│   │   │   ├── app/                 # Next.js Pages (Dashboard, Inbox, Analytics, Budgets, Settings)
│   │   │   ├── components/          # Web UI Components (Shadcn UI + TailwindCSS)
│   │   │   ├── hooks/               # Dashboard React Hooks
│   │   │   └── lib/                 # Next.js Server Actions & API Client SDK
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── api/                         # Express Backend Server (Modular Monolith)
│       ├── src/
│       │   ├── modules/             # Bounded Context Modules
│       │   │   ├── capture/         # Apple Shortcuts SMS Ingestion Controller & Service
│       │   │   ├── transactions/    # Transaction CRUD & Invalidation
│       │   │   ├── categories/      # Category Taxonomy Controller
│       │   │   ├── merchants/       # Merchant Intelligence Memory Service
│       │   │   ├── analytics/       # MongoDB Aggregation Pipelines
│       │   │   ├── budgets/         # Budget Tracking & Threshold Calculators
│       │   │   ├── notifications/   # Push Notification Controller
│       │   │   ├── sync/            # Delta Sync Push/Pull Handlers
│       │   │   ├── users/           # User Profile Management
│       │   │   └── auth/            # OAuth & JWT Token Auth Controller
│       │   ├── middleware/          # Rate Limiter, Auth Guard, Error Handler, Logging
│       │   └── server.ts            # Express App Bootstrap
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── shared-types/                # Shared TypeScript DTOs, Enums & Interfaces
│   │   ├── src/
│   │   │   ├── transaction.dto.ts
│   │   │   ├── category.dto.ts
│   │   │   ├── sync.dto.ts
│   │   │   ├── event.dto.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── parser-engine/               # Bank SMS Regex & Parser Engine
│   │   ├── src/
│   │   │   ├── parsers/             # HDFC, ICICI, SBI, Axis, Kotak, IDFC, Generic Parsers
│   │   │   ├── fingerprint.ts       # SHA-256 Fingerprint Generator
│   │   │   ├── normalizer.ts        # String Cleaners & Entity Extractor
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── database/                    # MongoDB Mongoose Schemas & Models
│   │   ├── src/
│   │   │   ├── models/              # User, Transaction, Event, Merchant, Category Schemas
│   │   │   ├── indexes/             # Index Definitions
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── shared-ui/                   # Cross-Platform Design System & Web Components
│   ├── config/                      # Shared ESLint, Prettier, TypeScript, Tailwind Configs
│   ├── logger/                      # Pino Logger Wrapper
│   └── sdk/                         # Typed API SDK Client
│
├── services/
│   ├── ai-worker/                   # Ollama Qwen2.5:14B Consumer
│   ├── analytics-worker/            # Aggregation Worker
│   ├── sync-worker/                 # Async Sync Processor
│   ├── scheduler/                   # Cron Task Trigger
│   └── notification-worker/         # Expo Push Dispatcher
│
├── docs/                            # Production Architecture Documentation
├── tooling/                         # Docker & CI/CD Scripts
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## Package Responsibilities Summary

* `apps/mobile`: Primary user interface for iPhone/Android. Provides zero-friction payment confirmation, Inbox swipe actions, and offline SQLite caching.
* `apps/web`: Responsive web dashboard for detailed financial analysis, category taxonomy management, exports (CSV/PDF), and settings.
* `apps/api`: Core HTTP REST server delivering domain controllers, validation gates, transaction ingestion, and auth.
* `@expenseflow/parser-engine`: Independent TypeScript library exporting `parseSMS()`, bank regex matchers, string normalizers, and SHA-256 fingerprint generators.
* `@expenseflow/shared-types`: Universal TypeScript interfaces and Zod validation schemas compiled across all apps and micro-services.
* `@expenseflow/database`: Single source of truth for Mongoose models, MongoDB validation schemas, and database index definitions.
* `@expenseflow/logger`: Structured JSON logging framework wrapping Pino with trace ID injection.
* `services/*`: Micro-worker applications consuming BullMQ Redis queues to handle heavy asynchronous background work (AI inference, push notifications, cron schedules).
