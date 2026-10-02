# Deployment Architecture & DevOps Specification

## Container Strategy (Docker Compose)

ExpenseFlow AI uses Docker Compose to orchestrate local development and self-hosted VPS production deployments.

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    container_name: expenseflow-mongo
    restart: always
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: secretpassword
    volumes:
      - mongo_data:/data/db

  redis:
    image: redis:7.2-alpine
    container_name: expenseflow-redis
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  ollama:
    image: ollama/ollama:latest
    container_name: expenseflow-ollama
    restart: always
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]

  api:
    build:
      context: .
      dockerfile: tooling/docker/Dockerfile.api
    container_name: expenseflow-api
    restart: always
    ports:
      - "4000:4000"
    environment:
      NODE_ENV: production
      PORT: 4000
      MONGODB_URI: mongodb://admin:secretpassword@mongodb:27017/expenseflow?authSource=admin
      REDIS_URL: redis://redis:6379
    depends_on:
      - mongodb
      - redis

  ai-worker:
    build:
      context: .
      dockerfile: tooling/docker/Dockerfile.ai-worker
    container_name: expenseflow-ai-worker
    restart: always
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://admin:secretpassword@mongodb:27017/expenseflow?authSource=admin
      REDIS_URL: redis://redis:6379
      OLLAMA_HOST: http://ollama:11434
    depends_on:
      - mongodb
      - redis
      - ollama

volumes:
  mongo_data:
  redis_data:
  ollama_data:
```

---

## Cloudflare Tunnel Setup (Mobile Dev Testing)

To allow an iPhone running Apple Shortcuts to reach a local development machine safely without public port forwarding:

1. Install Cloudflare Tunnel CLI (`cloudflared`):
   ```bash
   brew install cloudflared
   ```
2. Launch HTTP Tunnel exposing local API port `4000`:
   ```bash
   cloudflared tunnel --url http://localhost:4000
   ```
3. Copy assigned Cloudflare HTTPS URL (e.g., `https://random-subdomain.trycloudflare.com`) and paste into Apple Shortcuts action configuration.

---

## GitHub Actions CI/CD Pipeline

Location: `.github/workflows/ci.yml`

```yaml
name: ExpenseFlow CI Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install Dependencies
        run: pnpm install --frozen-lockfile

      - name: Run Typecheck
        run: pnpm typecheck

      - name: Run ESLint
        run: pnpm lint

      - name: Run Unit Tests
        run: pnpm test
```
