# Curebase — Clinical Trial Participant Capture

TypeScript monorepo for a clinical trial participant registration form. Captures demographics, computes BMI server-side, and lists participants with keyset pagination and BMI filtering.

## Architecture

```
apps/web  (React + Vite)  ──HTTP──▶  apps/api  (Fastify + Drizzle)  ──SQL──▶  PostgreSQL
                 ▲                          ▲
                 └──── packages/shared (Zod HTTP contracts) ────┘
```

- **`packages/shared`** — Zod schemas and inferred TypeScript types for request/response contracts
- **`apps/api`** — Fastify server with domain services (BMI computation, pagination), Drizzle ORM, migrations
- **`apps/web`** — React UI with TanStack Query, React Hook Form, dark/light theme toggle

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [Docker](https://www.docker.com/) (for PostgreSQL)
- npm (ships with Node.js)

## Getting Started

### 1. Clone and install dependencies

```bash
git clone <repo-url> && cd Curebase
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

The defaults work out of the box with the Docker Compose database:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://curebase:curebase@localhost:5432/curebase` | PostgreSQL connection string |
| `API_PORT` | `3001` | Port for the Fastify API server |
| `WEB_ORIGIN` | `http://localhost:5173` | Allowed CORS origin (Vite dev server) |

### 3. Start PostgreSQL

```bash
docker compose up -d
```

This starts PostgreSQL 16 on port 5432. The database `curebase` is created automatically.

### 4. Run database migrations

Migrations run automatically when the API starts, but you can also run them manually:

```bash
npm run dev --workspace=apps/api
```

### 5. Start the development servers

From the project root, start both the API and web servers:

```bash
npm run dev
```

This runs:
- **API** at `http://localhost:3001` (Fastify with hot reload via tsx)
- **Web** at `http://localhost:5173` (Vite dev server, proxies `/participants` to the API)

### 6. Open the app

Visit [http://localhost:5173](http://localhost:5173) in your browser.

## Running Tests

Run the full test suite across all packages:

```bash
npm test
```

Run tests for a specific package:

```bash
npm test --workspace=packages/shared
npm test --workspace=apps/api
npm test --workspace=apps/web
```

Run tests in watch mode:

```bash
npm run test:watch --workspace=apps/api
```

> **Note:** API tests require a running PostgreSQL instance (no mocked databases).

## Stopping the Database

```bash
docker compose down
```

To also remove the persisted data volume:

```bash
docker compose down -v
```
