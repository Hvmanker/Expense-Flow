# ADR-001: Monorepo Structure and Domain-Driven Design (DDD)

## Status
Approved

## Context
ExpenseFlow AI is a complex financial ecosystem consisting of a React Native iOS/Android mobile application, a Next.js web dashboard, a Node.js/Express REST API, background micro-workers (AI, analytics, sync, notifications), and shared domain engines (SMS parser engine, database schemas, shared DTOs). 

We need a code organization strategy that maximizes code reuse, enforces strict TypeScript contracts across client and server boundaries, avoids code duplication, and keeps domain logic isolated and modular as the application scales.

## Decision
We decide to adopt an **Offline-First Event-Driven Modular Monolith** structured as a **Turborepo monorepo using PNPM package manager**, strictly organized around **Domain-Driven Design (DDD)** bounded contexts.

### Bounded Contexts
1. **Capture:** Ingestion of SMS payloads via Apple Shortcuts webhooks, raw message normalization, bank regex matching.
2. **Transactions:** Core transaction lifecycle management, fingerprint generation, audit logging, manual editing, and tagging.
3. **Categories:** Hierarchical nested category taxonomy, budget mappings, custom user icons, and color assignments.
4. **Merchants:** Intelligence memory system storing default category associations, confidence scores, spending frequency, and normalized merchant strings.
5. **AI Engine:** Asynchronous transaction auto-categorization, embedding generation, vector memory retrieval, and natural language query processing.
6. **Analytics:** Aggregated daily, weekly, monthly spend rollups, category breakdowns, merchant analytics, and time-of-day spending vectors.
7. **Budgets:** Periodic spend limit tracking, recurring rollover budgets, overspend alert triggers.
8. **Notifications:** Event-triggered and schedule-based push notification engine with deep-linking payload support.
9. **Sync:** Delta sync queue management, conflict resolution algorithm (Last-Write-Wins with Event-Log audit), and SQLite cache synchronization.
10. **Users & Auth:** Device token authentication, Apple/Google OAuth, JWT token refresh rotation, and user preferences.

### Monorepo Structure
```text
expense-tracker/
├── apps/
│   ├── mobile/         # Expo / React Native App
│   ├── web/            # Next.js App Router Web Dashboard
│   └── api/            # Express REST API (Modular Monolith)
├── packages/
│   ├── shared-types/   # Shared DTOs, Enums, Interfaces, Zod schemas
│   ├── shared-ui/      # Cross-platform / Web design tokens & UI components
│   ├── parser-engine/  # Bank SMS Regex & Parser Engine
│   ├── database/       # Mongoose models & SQLite schema specifications
│   ├── config/         # Shared ESLint, Prettier, TypeScript, Tailwind configs
│   ├── logger/         # Structured Pino logging utility
│   └── sdk/            # Typed API Client for frontend apps
└── services/
    ├── ai-worker/           # Ollama + Qwen2.5:14B queue consumer
    ├── analytics-worker/    # Periodic aggregation rollup consumer
    ├── sync-worker/         # Asynchronous delta sync processor
    ├── scheduler/           # Cron trigger service for recurring tasks
    └── notification-worker/ # Push notification dispatcher
```

## Consequences
### Positive
* **100% Type Safety:** Shared Zod validation schemas and TypeScript DTOs eliminate type drift between API endpoints, mobile SQLite models, and Next.js frontend state.
* **Single Source of Truth:** Core logic like `@expenseflow/parser-engine` is maintained independently and testable in isolation.
* **Fast Development Velocity:** Turborepo handles caching of builds, linting, and testing across the monorepo.
* **Modular Clean Architecture:** Bounded contexts keep domain dependencies unidirectional and decoupled.

### Negative
* **Initial Setup Overhead:** Workspace configuration (`pnpm-workspace.yaml`, `turbo.json`, tsconfig references) requires upfront effort.
* **Build Configuration Discipline:** Strict boundaries must be enforced to prevent circular dependencies between packages.
