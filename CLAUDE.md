# CLAUDE.md — Curebase Form (CareOps v1)

Project rules derived from ADR-001 and TRD-001. These are non-negotiable constraints for all implementation work in this repository.

## Project overview

TypeScript monorepo (npm workspaces) for a Clinical Trial Participant Capture form. Three packages: `apps/web` (React), `apps/api` (Fastify), `packages/shared` (Zod HTTP contracts). PostgreSQL via Drizzle ORM. Docker Compose for local development.

## Architecture boundaries

### Package responsibilities — hard boundaries

- **`packages/shared`**: Zod HTTP schemas and inferred types ONLY. No BMI formula. No SQL. No domain logic. No service code.
- **`apps/api`**: Fastify routes, domain services (BMI computation, email uniqueness), Drizzle schema, migrations, data access. All domain logic lives here.
- **`apps/web`**: React UI, TanStack Query, React Hook Form. No BMI computation. No database access. The browser is never the source of truth for BMI or uniqueness.

### Dependency direction

```
apps/web → packages/shared (build-time import)
apps/api → packages/shared (build-time import)
apps/web → apps/api (HTTP only, never build-time)
apps/api → PostgreSQL (Drizzle, parameterized SQL only)
```

`apps/web` and `apps/api` must never depend on each other at build time.

## Domain rules

### BMI

- Computed ONLY in `apps/api` domain service at write time.
- US formula: `(weight_lb / height_in²) × 703`
- Metric formula: `weight_kg / (height_cm / 100)²`
- Stored as `numeric(6,2)`. Displayed with 1 decimal.
- The client may show a preview; the server result is authoritative.
- BMI is never accepted from the client in `POST /participants`.

### Validation ranges

- US: weight 50–700 lb, height 20–90 in
- Metric: weight 20–320 kg, height 50–230 cm
- Age: integer 0–120
- Phone: 10–15 digits after stripping spaces/dashes
- Names: trimmed, min length 1
- Email: valid email format

### Unique email

- One participant row per email. Duplicates return 409.
- Case-insensitive via `citext` PostgreSQL extension.
- Enforced at the database level with a unique constraint.

## API conventions

- JSON request/response bodies use **camelCase**.
- Database columns use **snake_case**.
- Mapping happens in the data access layer.
- CORS restricted to the configured web origin.
- `unitSystem` defaults to `"us"` when omitted.

### Error responses

| Status | When |
| --- | --- |
| 400 | Validation failure — include field-level messages |
| 409 | Duplicate email |
| 500 | Unexpected — generic message, no PHI in response |

### Pagination

- Keyset pagination on `(created_at DESC, id DESC)`. Never use `OFFSET`.
- Cursor is opaque URL-safe base64 JSON containing `createdAt` and `id` only — no PHI.
- Read `limit + 1` to determine `hasNextPage` / `hasPrevPage`.
- Default `limit` is 10, range 1–100.
- `direction=prev` requires a cursor. First page omits cursor and direction.
- Backward pages reverse sort internally but return desc order to the client.

## Database rules

- Use Drizzle ORM for all queries — no raw SQL string concatenation.
- All SQL must be parameterized.
- Require `citext` extension for the email column.
- Indexes must be justified by access patterns, not guesswork:
  - Unique on `email` (constraint)
  - B-tree on `bmi` (range filter)
  - B-tree on `(created_at DESC, id DESC)` (pagination)
- Check constraints enforce: `unit_system IN ('us', 'metric')`, `age 0–120`, `weight > 0`, `height > 0`, `bmi > 0`.
- No committed seed data. Tests generate their own fixtures.

## Frontend rules

- React with TypeScript (strict mode).
- TanStack Query for all server state. No manual fetch + useState patterns.
- React Hook Form + Zod for the registration form. Use the shared `createParticipantSchema`.
- Required UI states for every data-fetching view: **loading**, **empty**, **error**.
- Required save states: **submitting**, **success**, **field error**, **server error**.
- Filter and pagination state (`minBmi`, `maxBmi`, `cursor`, `direction`) lives in the URL.
- Changing the filter clears cursor and direction.
- Successful save resets the form to US defaults and refreshes the list from the start of the current filter.
- Dark theme by default. Light/dark toggle.
- Empty copy: "No participants yet." Filtered empty: "No participants match this BMI range."
- No page numbers. Previous / Next buttons driven by `hasPrevPage` / `hasNextPage`.

## Security and PHI

### PHI fields

first name, last name, email, phone, age, height, weight, BMI — treat all as PHI.

### Rules

- Never log PHI.
- Never commit secrets.
- Never concatenate user-controlled SQL.
- Never trust the browser for BMI or email uniqueness.
- Error responses (especially 500) must not leak PHI or stack traces.
- CORS limited to the web origin — no wildcard.
- No authentication in v1 — this is a documented scope cut, not permission to relax other controls.
- Cursor payloads must not contain PHI fields.

## TypeScript rules

- Strict mode enabled in all packages.
- No `any` — justify exceptional cases with a comment.
- Validate all external input at system boundaries.
- Keep route handlers thin — delegate to domain services.
- Prefer small, cohesive modules.
- Explicit error handling — never silently swallow errors.

## Testing rules

- Meaningful tests over coverage metrics.
- API and database tests run against a real PostgreSQL instance — no mocked databases.
- Each test manages its own data — no shared seed data across tests.

### Required test coverage

- **Unit**: BMI formulas (US + metric), rounding, shared Zod schemas (valid/invalid fixtures)
- **API integration**: 400 validation, 409 duplicate email, BMI persistence, min/max filter, keyset pagination (next/prev, invalid cursor → 400)
- **Database**: unique email constraint, check constraints
- **Frontend**: form validation, unit toggle label switching, URL filter/pagination state

## Git conventions

- Small atomic commits.
- Format: `<type>: <description>` (feat, fix, refactor, docs, test, chore, perf, ci)
- Never commit secrets, credentials, generated PHI, or production data.

## Local development

- `docker compose up` starts PostgreSQL (and optionally the API)
- API runs Drizzle migrations on boot
- `npm run dev` at root starts both Vite and Fastify
- Required env vars: `DATABASE_URL`, `API_PORT`, `WEB_ORIGIN` (see `.env.example`)

## Out of scope (v1)

Do not implement any of the following:
- Update or delete endpoints
- Authentication / login
- Tenant isolation
- Background workers
- AWS infrastructure
- Nx or Turborepo
- Canonical metric storage
- Separate git repositories
- Seed data in the repository
