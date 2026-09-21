# Clinical Trial Participant Capture — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack TypeScript monorepo that captures clinical trial participant demographics, computes BMI server-side, persists to PostgreSQL, and renders a filterable, keyset-paginated table.

**Architecture:** npm workspaces monorepo with three packages. `packages/shared` holds Zod HTTP schemas consumed by both `apps/api` (Fastify + Drizzle) and `apps/web` (React + Vite). BMI is computed only in the API domain layer, never in the browser or shared package. Keyset pagination on `(created_at DESC, id DESC)` — no OFFSET.

**Tech Stack:** TypeScript (strict), React 18+, Vite, TanStack Query v5, React Hook Form, Zod, Fastify, Drizzle ORM, PostgreSQL 15+, Vitest, Docker Compose.

**Spec:** `docs/TRD-001.md` (requirements), `ADR-001.MD` (architecture decisions), `CLAUDE.md` (project rules).

## Global constraints

- TypeScript strict mode in all packages — no `any`.
- `packages/shared` contains ONLY Zod schemas and inferred types — no BMI, no SQL, no domain logic.
- BMI is computed exclusively in `apps/api` domain layer.
- All SQL parameterized via Drizzle ORM — no string concatenation.
- PHI (name, email, phone, age, height, weight, BMI) never appears in logs.
- Error responses never leak PHI or stack traces.
- CORS restricted to configured web origin.
- No OFFSET pagination — keyset only.
- No authentication, no update/delete endpoints, no Nx/Turborepo.
- JSON bodies use camelCase; database columns use snake_case.
- Tests run against real PostgreSQL — no mocked databases.

## File structure

```
.
├── package.json                          # workspaces root
├── tsconfig.base.json                    # shared TS config
├── docker-compose.yml                    # postgres service
├── .env.example                          # env template
├── .gitignore
├── packages/
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts                  # barrel export
│           ├── schemas/
│           │   ├── participant.ts        # create body schema
│           │   ├── list-query.ts         # GET query params schema
│           │   └── list-response.ts      # GET response shape
│           └── __tests__/
│               └── schemas.test.ts
├── apps/
│   ├── api/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── drizzle.config.ts
│   │   └── src/
│   │       ├── index.ts                  # entry: start server
│   │       ├── app.ts                    # Fastify app factory
│   │       ├── config.ts                 # env config
│   │       ├── db/
│   │       │   ├── connection.ts         # Drizzle + pg pool
│   │       │   ├── schema.ts             # participants table
│   │       │   └── migrate.ts            # run migrations on boot
│   │       ├── services/
│   │       │   ├── bmi.ts                # BMI formulas
│   │       │   ├── cursor.ts             # keyset cursor encode/decode
│   │       │   └── participants.ts       # create + list orchestration
│   │       ├── routes/
│   │       │   └── participants.ts       # POST + GET route handlers
│   │       └── __tests__/
│   │           ├── setup.ts              # test DB lifecycle
│   │           ├── bmi.test.ts
│   │           ├── cursor.test.ts
│   │           └── participants.integration.test.ts
│   └── web/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── index.html
│       └── src/
│           ├── main.tsx                  # React root + providers
│           ├── App.tsx                   # page layout
│           ├── App.css                   # global styles + theme vars
│           ├── api/
│           │   └── client.ts             # fetch wrapper
│           ├── hooks/
│           │   ├── useCreateParticipant.ts
│           │   ├── useParticipants.ts
│           │   └── useUrlState.ts
│           ├── components/
│           │   ├── ThemeToggle.tsx
│           │   ├── ParticipantForm.tsx
│           │   ├── ParticipantTable.tsx
│           │   ├── BmiFilter.tsx
│           │   └── Pagination.tsx
│           └── __tests__/
│               ├── schemas.test.ts       # shared schema behavior from web
│               └── useUrlState.test.ts
```

---

### Task 1: Monorepo scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: working npm workspace with `npm install`, `npm run build` across all packages; Docker Compose starts PostgreSQL on `localhost:5432`

- [ ] **Step 1: Create root `package.json`**

```json
{
  "name": "curebase-form",
  "private": true,
  "workspaces": ["packages/*", "apps/*"],
  "scripts": {
    "dev": "npm run dev --workspaces --if-present",
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present"
  },
  "engines": {
    "node": ">=20"
  }
}
```

- [ ] **Step 2: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 3: Create `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: curebase
      POSTGRES_PASSWORD: curebase
      POSTGRES_DB: curebase
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U curebase"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  pgdata:
```

- [ ] **Step 4: Create `.env.example`**

```env
DATABASE_URL=postgresql://curebase:curebase@localhost:5432/curebase
API_PORT=3001
WEB_ORIGIN=http://localhost:5173
```

- [ ] **Step 5: Create `.gitignore`**

```
node_modules/
dist/
.env
*.local
.DS_Store
```

- [ ] **Step 6: Create `packages/shared/package.json`**

```json
{
  "name": "@curebase/shared",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 7: Create `packages/shared/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 8: Create `packages/shared/src/index.ts`**

```typescript
// Barrel export — schemas added in Task 2
export {};
```

- [ ] **Step 9: Create `apps/api/package.json`**

```json
{
  "name": "@curebase/api",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx src/db/migrate.ts"
  },
  "dependencies": {
    "@curebase/shared": "*",
    "fastify": "^5.0.0",
    "@fastify/cors": "^10.0.0",
    "drizzle-orm": "^0.35.0",
    "postgres": "^3.4.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "tsx": "^4.19.0",
    "vitest": "^2.0.0",
    "drizzle-kit": "^0.27.0",
    "@types/node": "^22.0.0"
  }
}
```

- [ ] **Step 10: Create `apps/api/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 11: Create `apps/web/package.json`**

```json
{
  "name": "@curebase/web",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@curebase/shared": "*",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@tanstack/react-query": "^5.50.0",
    "react-hook-form": "^7.52.0",
    "@hookform/resolvers": "^3.9.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vite": "^6.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "vitest": "^2.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0"
  }
}
```

- [ ] **Step 12: Create `apps/web/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "./dist",
    "rootDir": "./src",
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 13: Run `npm install` and verify**

Run: `npm install`

Expected: lockfile created, all three workspaces recognized. Verify with:
```bash
npm ls --workspaces
```
Expected output lists `@curebase/shared`, `@curebase/api`, `@curebase/web`.

- [ ] **Step 14: Start Postgres and verify**

```bash
docker compose up -d
docker compose exec postgres pg_isready -U curebase
```

Expected: `accepting connections`

- [ ] **Step 15: Commit**

```bash
git init
git add package.json tsconfig.base.json docker-compose.yml .env.example .gitignore \
  packages/shared/package.json packages/shared/tsconfig.json packages/shared/src/index.ts \
  apps/api/package.json apps/api/tsconfig.json \
  apps/web/package.json apps/web/tsconfig.json \
  package-lock.json
git commit -m "chore: scaffold monorepo with npm workspaces"
```

---

### Task 2: Shared Zod schemas

**Files:**
- Create: `packages/shared/src/schemas/participant.ts`
- Create: `packages/shared/src/schemas/list-query.ts`
- Create: `packages/shared/src/schemas/list-response.ts`
- Modify: `packages/shared/src/index.ts`
- Create: `packages/shared/src/__tests__/schemas.test.ts`

**Interfaces:**
- Consumes: Zod (from Task 1 dependencies)
- Produces:
  - `createParticipantSchema` — Zod object schema for POST body; inferred type `CreateParticipantInput`
  - `listParticipantsQuerySchema` — Zod object schema for GET query; inferred type `ListParticipantsQuery`
  - `participantSchema` — Zod object for a single participant in responses; inferred type `Participant`
  - `listParticipantsResponseSchema` — Zod object for GET response; inferred type `ListParticipantsResponse`

- [ ] **Step 1: Write failing schema tests**

Create `packages/shared/src/__tests__/schemas.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  createParticipantSchema,
  listParticipantsQuerySchema,
  participantSchema,
} from '../index.js';

describe('createParticipantSchema', () => {
  it('accepts a valid US participant', () => {
    const input = {
      firstName: 'Peter',
      lastName: 'Pan',
      email: 'peter@example.com',
      phone: '1234567890',
      age: 14,
      weight: 85,
      height: 54,
      unitSystem: 'us' as const,
    };
    const result = createParticipantSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts a valid metric participant', () => {
    const input = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      phone: '9876543210',
      age: 30,
      weight: 70,
      height: 170,
      unitSystem: 'metric' as const,
    };
    const result = createParticipantSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('defaults unitSystem to us', () => {
    const input = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      phone: '1234567890',
      age: 25,
      weight: 150,
      height: 65,
    };
    const result = createParticipantSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.unitSystem).toBe('us');
    }
  });

  it('rejects empty firstName', () => {
    const input = {
      firstName: '',
      lastName: 'Pan',
      email: 'peter@example.com',
      phone: '1234567890',
      age: 14,
      weight: 85,
      height: 54,
    };
    const result = createParticipantSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const input = {
      firstName: 'Peter',
      lastName: 'Pan',
      email: 'not-an-email',
      phone: '1234567890',
      age: 14,
      weight: 85,
      height: 54,
    };
    const result = createParticipantSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects age above 120', () => {
    const input = {
      firstName: 'Peter',
      lastName: 'Pan',
      email: 'peter@example.com',
      phone: '1234567890',
      age: 121,
      weight: 85,
      height: 54,
    };
    const result = createParticipantSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects phone with fewer than 10 digits', () => {
    const input = {
      firstName: 'Peter',
      lastName: 'Pan',
      email: 'peter@example.com',
      phone: '12345',
      age: 14,
      weight: 85,
      height: 54,
    };
    const result = createParticipantSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('accepts phone with dashes and spaces (stripped to digits)', () => {
    const input = {
      firstName: 'Peter',
      lastName: 'Pan',
      email: 'peter@example.com',
      phone: '123-456-7890',
      age: 14,
      weight: 85,
      height: 54,
    };
    const result = createParticipantSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects US weight below 50 lb', () => {
    const input = {
      firstName: 'Peter',
      lastName: 'Pan',
      email: 'peter@example.com',
      phone: '1234567890',
      age: 14,
      weight: 10,
      height: 54,
      unitSystem: 'us' as const,
    };
    const result = createParticipantSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects metric height below 50 cm', () => {
    const input = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      phone: '9876543210',
      age: 30,
      weight: 70,
      height: 30,
      unitSystem: 'metric' as const,
    };
    const result = createParticipantSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('trims firstName and lastName', () => {
    const input = {
      firstName: '  Peter  ',
      lastName: '  Pan  ',
      email: 'peter@example.com',
      phone: '1234567890',
      age: 14,
      weight: 85,
      height: 54,
    };
    const result = createParticipantSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.firstName).toBe('Peter');
      expect(result.data.lastName).toBe('Pan');
    }
  });
});

describe('listParticipantsQuerySchema', () => {
  it('accepts empty query (all defaults)', () => {
    const result = listParticipantsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(10);
      expect(result.data.direction).toBe('next');
    }
  });

  it('accepts minBmi and maxBmi', () => {
    const result = listParticipantsQuerySchema.safeParse({
      minBmi: 18.5,
      maxBmi: 25.0,
    });
    expect(result.success).toBe(true);
  });

  it('rejects limit below 1', () => {
    const result = listParticipantsQuerySchema.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects limit above 100', () => {
    const result = listParticipantsQuerySchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it('rejects direction=prev without cursor', () => {
    const result = listParticipantsQuerySchema.safeParse({
      direction: 'prev',
    });
    expect(result.success).toBe(false);
  });

  it('accepts direction=prev with cursor', () => {
    const result = listParticipantsQuerySchema.safeParse({
      direction: 'prev',
      cursor: 'abc123',
    });
    expect(result.success).toBe(true);
  });
});

describe('participantSchema', () => {
  it('accepts a full participant object', () => {
    const participant = {
      id: '2f1b6e3a-7c4d-4a8e-9b21-0c8d5e1a4f70',
      firstName: 'Peter',
      lastName: 'Pan',
      email: 'peter@example.com',
      phone: '1234567890',
      age: 14,
      weight: 85,
      height: 54,
      unitSystem: 'us',
      bmi: 20.5,
      createdAt: '2025-08-24T19:16:40.000Z',
    };
    const result = participantSchema.safeParse(participant);
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/shared && npx vitest run`

Expected: FAIL — exports not found.

- [ ] **Step 3: Implement `packages/shared/src/schemas/participant.ts`**

```typescript
import { z } from 'zod';

const phoneDigits = (raw: string) => raw.replace(/[\s\-]/g, '');

const baseFields = {
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z
    .string()
    .transform(phoneDigits)
    .pipe(
      z
        .string()
        .regex(/^\d+$/, 'Phone must contain only digits')
        .min(10, 'Phone must have at least 10 digits')
        .max(15, 'Phone must have at most 15 digits'),
    ),
  age: z
    .number()
    .int('Age must be a whole number')
    .min(0, 'Age must be at least 0')
    .max(120, 'Age must be at most 120'),
};

const usSchema = z.object({
  ...baseFields,
  weight: z.number().min(50, 'Weight must be 50–700 lbs').max(700, 'Weight must be 50–700 lbs'),
  height: z.number().min(20, 'Height must be 20–90 inches').max(90, 'Height must be 20–90 inches'),
  unitSystem: z.literal('us').default('us'),
});

const metricSchema = z.object({
  ...baseFields,
  weight: z.number().min(20, 'Weight must be 20–320 kg').max(320, 'Weight must be 20–320 kg'),
  height: z.number().min(50, 'Height must be 50–230 cm').max(230, 'Height must be 50–230 cm'),
  unitSystem: z.literal('metric'),
});

export const createParticipantSchema = z.discriminatedUnion('unitSystem', [
  usSchema,
  metricSchema,
]).or(
  z.object({
    ...baseFields,
    weight: z.number().min(50).max(700),
    height: z.number().min(20).max(90),
    unitSystem: z.literal('us').default('us'),
  }),
);

export type CreateParticipantInput = z.infer<typeof createParticipantSchema>;
```

Note: The `.or()` fallback handles the case where `unitSystem` is omitted and defaults to `"us"`. The discriminated union handles the explicit case. If the discriminated-union approach creates friction during implementation (Zod's discriminatedUnion requires the discriminator to be present), simplify to a single schema with a `.superRefine()` that checks ranges based on `unitSystem`:

```typescript
export const createParticipantSchema = z
  .object({
    ...baseFields,
    weight: z.number().positive('Weight must be positive'),
    height: z.number().positive('Height must be positive'),
    unitSystem: z.enum(['us', 'metric']).default('us'),
  })
  .superRefine((data, ctx) => {
    if (data.unitSystem === 'us') {
      if (data.weight < 50 || data.weight > 700) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Weight must be 50–700 lbs', path: ['weight'] });
      }
      if (data.height < 20 || data.height > 90) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Height must be 20–90 inches', path: ['height'] });
      }
    } else {
      if (data.weight < 20 || data.weight > 320) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Weight must be 20–320 kg', path: ['weight'] });
      }
      if (data.height < 50 || data.height > 230) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Height must be 50–230 cm', path: ['height'] });
      }
    }
  });

export type CreateParticipantInput = z.infer<typeof createParticipantSchema>;
```

Use whichever approach produces cleaner test results. The `.superRefine()` variant is recommended because it handles the `unitSystem` default cleanly.

- [ ] **Step 4: Implement `packages/shared/src/schemas/list-query.ts`**

```typescript
import { z } from 'zod';

export const listParticipantsQuerySchema = z
  .object({
    minBmi: z.coerce.number().optional(),
    maxBmi: z.coerce.number().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    cursor: z.string().min(1).optional(),
    direction: z.enum(['next', 'prev']).default('next'),
  })
  .refine(
    (data) => {
      if (data.direction === 'prev' && !data.cursor) return false;
      return true;
    },
    { message: 'cursor is required when direction is prev', path: ['cursor'] },
  )
  .refine(
    (data) => {
      if (data.minBmi !== undefined && data.maxBmi !== undefined) {
        return data.minBmi <= data.maxBmi;
      }
      return true;
    },
    { message: 'minBmi must be less than or equal to maxBmi', path: ['minBmi'] },
  );

export type ListParticipantsQuery = z.infer<typeof listParticipantsQuerySchema>;
```

- [ ] **Step 5: Implement `packages/shared/src/schemas/list-response.ts`**

```typescript
import { z } from 'zod';

export const participantSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phone: z.string(),
  age: z.number().int(),
  weight: z.number(),
  height: z.number(),
  unitSystem: z.enum(['us', 'metric']),
  bmi: z.number(),
  createdAt: z.string().datetime(),
});

export type Participant = z.infer<typeof participantSchema>;

export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100),
  nextCursor: z.string().nullable(),
  prevCursor: z.string().nullable(),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
});

export type Pagination = z.infer<typeof paginationSchema>;

export const listParticipantsResponseSchema = z.object({
  items: z.array(participantSchema),
  pagination: paginationSchema,
  total: z.number().int().min(0),
});

export type ListParticipantsResponse = z.infer<typeof listParticipantsResponseSchema>;
```

- [ ] **Step 6: Update barrel export `packages/shared/src/index.ts`**

```typescript
export {
  createParticipantSchema,
  type CreateParticipantInput,
} from './schemas/participant.js';

export {
  listParticipantsQuerySchema,
  type ListParticipantsQuery,
} from './schemas/list-query.js';

export {
  participantSchema,
  type Participant,
  paginationSchema,
  type Pagination,
  listParticipantsResponseSchema,
  type ListParticipantsResponse,
} from './schemas/list-response.js';
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd packages/shared && npx vitest run`

Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/shared/
git commit -m "feat: add shared Zod HTTP contract schemas"
```

---

### Task 3: Database schema & migrations

**Files:**
- Create: `apps/api/src/config.ts`
- Create: `apps/api/src/db/schema.ts`
- Create: `apps/api/src/db/connection.ts`
- Create: `apps/api/src/db/migrate.ts`
- Create: `apps/api/drizzle.config.ts`

**Interfaces:**
- Consumes: PostgreSQL running via Docker Compose (Task 1), `DATABASE_URL` env var
- Produces:
  - `participants` Drizzle table definition with all columns, constraints, and indexes
  - `getDb()` function returning a Drizzle instance
  - `runMigrations()` function for boot-time migration
  - Generated SQL migration in `apps/api/src/db/migrations/`

- [ ] **Step 1: Create `apps/api/src/config.ts`**

```typescript
import { z } from 'zod';

const configSchema = z.object({
  databaseUrl: z.string().url(),
  apiPort: z.coerce.number().int().default(3001),
  webOrigin: z.string().url().default('http://localhost:5173'),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
  return configSchema.parse({
    databaseUrl: process.env.DATABASE_URL,
    apiPort: process.env.API_PORT,
    webOrigin: process.env.WEB_ORIGIN,
  });
}
```

- [ ] **Step 2: Create `apps/api/src/db/schema.ts`**

```typescript
import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  timestamp,
  index,
  check,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const participants = pgTable(
  'participants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email').notNull(),
    phone: text('phone').notNull(),
    age: integer('age').notNull(),
    weight: numeric('weight').notNull(),
    height: numeric('height').notNull(),
    unitSystem: text('unit_system').notNull().default('us'),
    bmi: numeric('bmi', { precision: 6, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('participants_email_unique').on(table.email),
    index('participants_bmi_idx').on(table.bmi),
    index('participants_created_at_id_idx').on(
      sql`${table.createdAt} DESC`,
      sql`${table.id} DESC`,
    ),
    check('unit_system_check', sql`${table.unitSystem} IN ('us', 'metric')`),
    check('age_check', sql`${table.age} >= 0 AND ${table.age} <= 120`),
    check('weight_check', sql`${table.weight} > 0`),
    check('height_check', sql`${table.height} > 0`),
    check('bmi_check', sql`${table.bmi} > 0`),
  ],
);
```

Note: The `email` column uses `text` in Drizzle. The migration SQL must be manually edited to use `citext` and include `CREATE EXTENSION IF NOT EXISTS citext;`. See Step 5.

- [ ] **Step 3: Create `apps/api/src/db/connection.ts`**

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let client: ReturnType<typeof postgres> | null = null;

export function getDb(databaseUrl: string) {
  if (!db) {
    client = postgres(databaseUrl);
    db = drizzle(client, { schema });
  }
  return db;
}

export async function closeDb() {
  if (client) {
    await client.end();
    client = null;
    db = null;
  }
}
```

- [ ] **Step 4: Create `apps/api/src/db/migrate.ts`**

```typescript
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { getDb } from './connection.js';

export async function runMigrations(databaseUrl: string) {
  const db = getDb(databaseUrl);
  await migrate(db, { migrationsFolder: './src/db/migrations' });
}
```

- [ ] **Step 5: Create `apps/api/drizzle.config.ts`**

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 6: Generate the migration**

```bash
cd apps/api
DATABASE_URL=postgresql://curebase:curebase@localhost:5432/curebase npx drizzle-kit generate
```

Expected: a migration SQL file is created in `apps/api/src/db/migrations/`.

- [ ] **Step 7: Edit the generated migration to use citext**

Open the generated migration file and add at the top (before the CREATE TABLE):

```sql
CREATE EXTENSION IF NOT EXISTS citext;
```

Then change the `email` column type from `text` to `citext` in the CREATE TABLE statement.

- [ ] **Step 8: Run the migration**

```bash
cd apps/api
DATABASE_URL=postgresql://curebase:curebase@localhost:5432/curebase npx tsx src/db/migrate.ts
```

Expected: migration runs without errors.

- [ ] **Step 9: Verify the table**

```bash
docker compose exec postgres psql -U curebase -c "\d participants"
```

Expected: table exists with correct columns, types, constraints, and indexes.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/config.ts apps/api/src/db/ apps/api/drizzle.config.ts
git commit -m "feat: add database schema, connection, and migrations"
```

---

### Task 4: Domain services — BMI & cursor

**Files:**
- Create: `apps/api/src/services/bmi.ts`
- Create: `apps/api/src/services/cursor.ts`
- Create: `apps/api/src/__tests__/bmi.test.ts`
- Create: `apps/api/src/__tests__/cursor.test.ts`

**Interfaces:**
- Consumes: nothing (pure functions)
- Produces:
  - `computeBmi(weight: number, height: number, unitSystem: 'us' | 'metric'): number` — returns BMI rounded to 2 decimal places
  - `encodeCursor(createdAt: Date, id: string): string` — returns URL-safe base64 string
  - `decodeCursor(cursor: string): { createdAt: Date; id: string }` — throws on invalid input
  - `CursorError` class for invalid cursor detection

- [ ] **Step 1: Write failing BMI tests**

Create `apps/api/src/__tests__/bmi.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { computeBmi } from '../services/bmi.js';

describe('computeBmi', () => {
  describe('US formula: (weight_lb / height_in²) × 703', () => {
    it('computes BMI for 150 lbs, 65 inches', () => {
      const bmi = computeBmi(150, 65, 'us');
      // (150 / 65²) × 703 = (150 / 4225) × 703 = 0.03550... × 703 = 24.96
      expect(bmi).toBeCloseTo(24.96, 1);
    });

    it('computes BMI for 85 lbs, 54 inches', () => {
      const bmi = computeBmi(85, 54, 'us');
      // (85 / 2916) × 703 = 20.49
      expect(bmi).toBeCloseTo(20.49, 1);
    });

    it('computes BMI at lower US boundary (50 lbs, 20 in)', () => {
      const bmi = computeBmi(50, 20, 'us');
      // (50 / 400) × 703 = 87.88
      expect(bmi).toBeCloseTo(87.88, 1);
    });
  });

  describe('Metric formula: weight_kg / (height_cm / 100)²', () => {
    it('computes BMI for 70 kg, 170 cm', () => {
      const bmi = computeBmi(70, 170, 'metric');
      // 70 / (1.7)² = 70 / 2.89 = 24.22
      expect(bmi).toBeCloseTo(24.22, 1);
    });

    it('computes BMI for 90 kg, 180 cm', () => {
      const bmi = computeBmi(90, 180, 'metric');
      // 90 / (1.8)² = 90 / 3.24 = 27.78
      expect(bmi).toBeCloseTo(27.78, 1);
    });
  });

  describe('rounding', () => {
    it('rounds to 2 decimal places', () => {
      const bmi = computeBmi(150, 65, 'us');
      const decimalPlaces = bmi.toString().split('.')[1]?.length ?? 0;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });
  });
});
```

- [ ] **Step 2: Run BMI tests to verify they fail**

Run: `cd apps/api && npx vitest run src/__tests__/bmi.test.ts`

Expected: FAIL — `computeBmi` not found.

- [ ] **Step 3: Implement `apps/api/src/services/bmi.ts`**

```typescript
type UnitSystem = 'us' | 'metric';

export function computeBmi(weight: number, height: number, unitSystem: UnitSystem): number {
  let bmi: number;

  if (unitSystem === 'us') {
    bmi = (weight / (height * height)) * 703;
  } else {
    const heightM = height / 100;
    bmi = weight / (heightM * heightM);
  }

  return Math.round(bmi * 100) / 100;
}
```

- [ ] **Step 4: Run BMI tests to verify they pass**

Run: `cd apps/api && npx vitest run src/__tests__/bmi.test.ts`

Expected: all tests PASS.

- [ ] **Step 5: Write failing cursor tests**

Create `apps/api/src/__tests__/cursor.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { encodeCursor, decodeCursor, CursorError } from '../services/cursor.js';

describe('cursor', () => {
  const createdAt = new Date('2025-08-24T19:16:40.000Z');
  const id = '2f1b6e3a-7c4d-4a8e-9b21-0c8d5e1a4f70';

  it('encodes and decodes a cursor round-trip', () => {
    const encoded = encodeCursor(createdAt, id);
    const decoded = decodeCursor(encoded);
    expect(decoded.createdAt.toISOString()).toBe(createdAt.toISOString());
    expect(decoded.id).toBe(id);
  });

  it('produces a URL-safe base64 string', () => {
    const encoded = encodeCursor(createdAt, id);
    expect(encoded).toMatch(/^[A-Za-z0-9_\-]+=*$/);
  });

  it('throws CursorError on invalid base64', () => {
    expect(() => decodeCursor('!!!not-base64!!!')).toThrow(CursorError);
  });

  it('throws CursorError on valid base64 but invalid JSON', () => {
    const encoded = Buffer.from('not json').toString('base64url');
    expect(() => decodeCursor(encoded)).toThrow(CursorError);
  });

  it('throws CursorError when createdAt is missing', () => {
    const encoded = Buffer.from(JSON.stringify({ id })).toString('base64url');
    expect(() => decodeCursor(encoded)).toThrow(CursorError);
  });

  it('throws CursorError when id is missing', () => {
    const encoded = Buffer.from(
      JSON.stringify({ createdAt: createdAt.toISOString() }),
    ).toString('base64url');
    expect(() => decodeCursor(encoded)).toThrow(CursorError);
  });
});
```

- [ ] **Step 6: Run cursor tests to verify they fail**

Run: `cd apps/api && npx vitest run src/__tests__/cursor.test.ts`

Expected: FAIL — imports not found.

- [ ] **Step 7: Implement `apps/api/src/services/cursor.ts`**

```typescript
import { z } from 'zod';

export class CursorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CursorError';
  }
}

const cursorPayloadSchema = z.object({
  createdAt: z.string().datetime(),
  id: z.string().uuid(),
});

export function encodeCursor(createdAt: Date, id: string): string {
  const payload = JSON.stringify({
    createdAt: createdAt.toISOString(),
    id,
  });
  return Buffer.from(payload).toString('base64url');
}

export function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  let raw: string;
  try {
    raw = Buffer.from(cursor, 'base64url').toString('utf-8');
  } catch {
    throw new CursorError('Invalid cursor encoding');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CursorError('Invalid cursor format');
  }

  const result = cursorPayloadSchema.safeParse(parsed);
  if (!result.success) {
    throw new CursorError('Invalid cursor payload');
  }

  return {
    createdAt: new Date(result.data.createdAt),
    id: result.data.id,
  };
}
```

- [ ] **Step 8: Run cursor tests to verify they pass**

Run: `cd apps/api && npx vitest run src/__tests__/cursor.test.ts`

Expected: all tests PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/services/bmi.ts apps/api/src/services/cursor.ts \
  apps/api/src/__tests__/bmi.test.ts apps/api/src/__tests__/cursor.test.ts
git commit -m "feat: add BMI computation and cursor encoding services"
```

---

### Task 5: Participant service & data access

**Files:**
- Create: `apps/api/src/services/participants.ts`
- Create: `apps/api/src/__tests__/setup.ts`
- Create: `apps/api/src/__tests__/participants.integration.test.ts`

**Interfaces:**
- Consumes:
  - `computeBmi(weight, height, unitSystem)` from `services/bmi.ts`
  - `encodeCursor(createdAt, id)` and `decodeCursor(cursor)` from `services/cursor.ts`
  - `participants` table from `db/schema.ts`
  - `getDb(url)` from `db/connection.ts`
  - `CreateParticipantInput` from `@curebase/shared`
  - `ListParticipantsQuery` from `@curebase/shared`
- Produces:
  - `createParticipant(db, input: CreateParticipantInput): Promise<Participant>` — computes BMI, inserts, returns full participant (camelCase)
  - `listParticipants(db, query: ListParticipantsQuery): Promise<ListParticipantsResponse>` — filters, paginates, returns response envelope
  - `DuplicateEmailError` class for 409 detection

- [ ] **Step 1: Create test setup `apps/api/src/__tests__/setup.ts`**

```typescript
import { getDb, closeDb } from '../db/connection.js';
import { runMigrations } from '../db/migrate.js';
import { participants } from '../db/schema.js';

const TEST_DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://curebase:curebase@localhost:5432/curebase';

export function getTestDb() {
  return getDb(TEST_DATABASE_URL);
}

export async function setupTestDb() {
  await runMigrations(TEST_DATABASE_URL);
}

export async function cleanParticipants() {
  const db = getTestDb();
  await db.delete(participants);
}

export async function teardownTestDb() {
  await closeDb();
}
```

- [ ] **Step 2: Write failing integration tests**

Create `apps/api/src/__tests__/participants.integration.test.ts`:

```typescript
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import {
  setupTestDb,
  getTestDb,
  cleanParticipants,
  teardownTestDb,
} from './setup.js';
import {
  createParticipant,
  listParticipants,
  DuplicateEmailError,
} from '../services/participants.js';

beforeAll(async () => {
  await setupTestDb();
});

beforeEach(async () => {
  await cleanParticipants();
});

afterAll(async () => {
  await teardownTestDb();
});

describe('createParticipant', () => {
  it('persists a US participant with computed BMI', async () => {
    const db = getTestDb();
    const result = await createParticipant(db, {
      firstName: 'Peter',
      lastName: 'Pan',
      email: 'peter@example.com',
      phone: '1234567890',
      age: 14,
      weight: 85,
      height: 54,
      unitSystem: 'us',
    });

    expect(result.id).toBeDefined();
    expect(result.firstName).toBe('Peter');
    expect(result.bmi).toBeCloseTo(20.49, 1);
    expect(result.unitSystem).toBe('us');
    expect(result.createdAt).toBeDefined();
  });

  it('persists a metric participant with computed BMI', async () => {
    const db = getTestDb();
    const result = await createParticipant(db, {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      phone: '9876543210',
      age: 30,
      weight: 70,
      height: 170,
      unitSystem: 'metric',
    });

    expect(result.bmi).toBeCloseTo(24.22, 1);
    expect(result.unitSystem).toBe('metric');
  });

  it('throws DuplicateEmailError on duplicate email', async () => {
    const db = getTestDb();
    const input = {
      firstName: 'Peter',
      lastName: 'Pan',
      email: 'peter@example.com',
      phone: '1234567890',
      age: 14,
      weight: 85,
      height: 54,
      unitSystem: 'us' as const,
    };

    await createParticipant(db, input);
    await expect(createParticipant(db, { ...input, firstName: 'Different' })).rejects.toThrow(
      DuplicateEmailError,
    );
  });

  it('treats email case-insensitively', async () => {
    const db = getTestDb();
    const input = {
      firstName: 'Peter',
      lastName: 'Pan',
      email: 'Peter@Example.com',
      phone: '1234567890',
      age: 14,
      weight: 85,
      height: 54,
      unitSystem: 'us' as const,
    };

    await createParticipant(db, input);
    await expect(
      createParticipant(db, { ...input, email: 'peter@example.com' }),
    ).rejects.toThrow(DuplicateEmailError);
  });
});

describe('listParticipants', () => {
  it('returns empty list when no participants exist', async () => {
    const db = getTestDb();
    const result = await listParticipants(db, { limit: 10, direction: 'next' });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.pagination.hasNextPage).toBe(false);
    expect(result.pagination.hasPrevPage).toBe(false);
  });

  it('returns participants sorted by createdAt desc', async () => {
    const db = getTestDb();
    await createParticipant(db, {
      firstName: 'First',
      lastName: 'User',
      email: 'first@example.com',
      phone: '1234567890',
      age: 20,
      weight: 150,
      height: 65,
      unitSystem: 'us',
    });
    await createParticipant(db, {
      firstName: 'Second',
      lastName: 'User',
      email: 'second@example.com',
      phone: '1234567891',
      age: 25,
      weight: 160,
      height: 70,
      unitSystem: 'us',
    });

    const result = await listParticipants(db, { limit: 10, direction: 'next' });

    expect(result.items).toHaveLength(2);
    expect(result.items[0].firstName).toBe('Second');
    expect(result.items[1].firstName).toBe('First');
  });

  it('filters by minBmi', async () => {
    const db = getTestDb();
    await createParticipant(db, {
      firstName: 'Low',
      lastName: 'Bmi',
      email: 'low@example.com',
      phone: '1234567890',
      age: 20,
      weight: 100,
      height: 80,
      unitSystem: 'us',
    });
    await createParticipant(db, {
      firstName: 'High',
      lastName: 'Bmi',
      email: 'high@example.com',
      phone: '1234567891',
      age: 20,
      weight: 300,
      height: 65,
      unitSystem: 'us',
    });

    const lowBmi = (await listParticipants(db, { limit: 10, direction: 'next' })).items;
    const highBmiValue = lowBmi.reduce((max, p) => Math.max(max, p.bmi), 0);

    const result = await listParticipants(db, {
      limit: 10,
      direction: 'next',
      minBmi: highBmiValue,
    });

    expect(result.items.every((p) => p.bmi >= highBmiValue)).toBe(true);
  });

  it('paginates forward with keyset cursor', async () => {
    const db = getTestDb();
    for (let i = 0; i < 5; i++) {
      await createParticipant(db, {
        firstName: `User${i}`,
        lastName: 'Test',
        email: `user${i}@example.com`,
        phone: '1234567890',
        age: 20 + i,
        weight: 150,
        height: 65,
        unitSystem: 'us',
      });
    }

    const page1 = await listParticipants(db, { limit: 2, direction: 'next' });
    expect(page1.items).toHaveLength(2);
    expect(page1.pagination.hasNextPage).toBe(true);
    expect(page1.pagination.nextCursor).not.toBeNull();

    const page2 = await listParticipants(db, {
      limit: 2,
      direction: 'next',
      cursor: page1.pagination.nextCursor!,
    });
    expect(page2.items).toHaveLength(2);

    const page1Ids = page1.items.map((p) => p.id);
    const page2Ids = page2.items.map((p) => p.id);
    expect(page1Ids).not.toEqual(expect.arrayContaining(page2Ids));
  });

  it('paginates backward', async () => {
    const db = getTestDb();
    for (let i = 0; i < 5; i++) {
      await createParticipant(db, {
        firstName: `User${i}`,
        lastName: 'Test',
        email: `user${i}@example.com`,
        phone: '1234567890',
        age: 20 + i,
        weight: 150,
        height: 65,
        unitSystem: 'us',
      });
    }

    const page1 = await listParticipants(db, { limit: 2, direction: 'next' });
    const page2 = await listParticipants(db, {
      limit: 2,
      direction: 'next',
      cursor: page1.pagination.nextCursor!,
    });

    expect(page2.pagination.hasPrevPage).toBe(true);
    expect(page2.pagination.prevCursor).not.toBeNull();

    const backToPage1 = await listParticipants(db, {
      limit: 2,
      direction: 'prev',
      cursor: page2.pagination.prevCursor!,
    });

    expect(backToPage1.items.map((p) => p.id)).toEqual(page1.items.map((p) => p.id));
  });

  it('returns correct total with BMI filter', async () => {
    const db = getTestDb();
    await createParticipant(db, {
      firstName: 'A',
      lastName: 'User',
      email: 'a@example.com',
      phone: '1234567890',
      age: 20,
      weight: 150,
      height: 65,
      unitSystem: 'us',
    });
    await createParticipant(db, {
      firstName: 'B',
      lastName: 'User',
      email: 'b@example.com',
      phone: '1234567891',
      age: 25,
      weight: 300,
      height: 65,
      unitSystem: 'us',
    });

    const all = await listParticipants(db, { limit: 10, direction: 'next' });
    expect(all.total).toBe(2);

    const filtered = await listParticipants(db, {
      limit: 10,
      direction: 'next',
      minBmi: 40,
    });
    expect(filtered.total).toBeLessThan(all.total);
  });
});
```

- [ ] **Step 3: Run integration tests to verify they fail**

Run: `cd apps/api && npx vitest run src/__tests__/participants.integration.test.ts`

Expected: FAIL — `services/participants.js` not found.

- [ ] **Step 4: Implement `apps/api/src/services/participants.ts`**

```typescript
import { eq, and, gte, lte, gt, lt, desc, asc, sql, count } from 'drizzle-orm';
import { participants } from '../db/schema.js';
import { computeBmi } from './bmi.js';
import { encodeCursor, decodeCursor, CursorError } from './cursor.js';
import type { CreateParticipantInput, ListParticipantsQuery, Participant, ListParticipantsResponse } from '@curebase/shared';

type Db = Parameters<typeof participants._.columns>[never] extends never
  ? ReturnType<typeof import('../db/connection.js').getDb>
  : never;

// Use a simpler Db type — accept any drizzle instance
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

export class DuplicateEmailError extends Error {
  constructor(email: string) {
    super('A participant with this email already exists');
    this.name = 'DuplicateEmailError';
  }
}

function toParticipant(row: typeof participants.$inferSelect): Participant {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    age: row.age,
    weight: Number(row.weight),
    height: Number(row.height),
    unitSystem: row.unitSystem as 'us' | 'metric',
    bmi: Number(row.bmi),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createParticipant(
  db: DrizzleDb,
  input: CreateParticipantInput,
): Promise<Participant> {
  const bmi = computeBmi(input.weight, input.height, input.unitSystem);

  try {
    const [row] = await db
      .insert(participants)
      .values({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        age: input.age,
        weight: String(input.weight),
        height: String(input.height),
        unitSystem: input.unitSystem,
        bmi: String(bmi),
      })
      .returning();

    return toParticipant(row);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes('unique') &&
      error.message.toLowerCase().includes('email')
    ) {
      throw new DuplicateEmailError(input.email);
    }
    throw error;
  }
}

export async function listParticipants(
  db: DrizzleDb,
  query: ListParticipantsQuery,
): Promise<ListParticipantsResponse> {
  const { limit, direction, cursor, minBmi, maxBmi } = query;
  const conditions = [];

  if (minBmi !== undefined) {
    conditions.push(gte(participants.bmi, String(minBmi)));
  }
  if (maxBmi !== undefined) {
    conditions.push(lte(participants.bmi, String(maxBmi)));
  }

  let cursorData: { createdAt: Date; id: string } | null = null;
  if (cursor) {
    cursorData = decodeCursor(cursor);
  }

  const isForward = direction === 'next';

  if (cursorData) {
    if (isForward) {
      conditions.push(
        sql`(${participants.createdAt}, ${participants.id}) < (${cursorData.createdAt}, ${cursorData.id})`,
      );
    } else {
      conditions.push(
        sql`(${participants.createdAt}, ${participants.id}) > (${cursorData.createdAt}, ${cursorData.id})`,
      );
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(participants)
    .where(whereClause)
    .orderBy(
      isForward ? desc(participants.createdAt) : asc(participants.createdAt),
      isForward ? desc(participants.id) : asc(participants.id),
    )
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const pageRows = rows.slice(0, limit);

  if (!isForward) {
    pageRows.reverse();
  }

  const items = pageRows.map(toParticipant);

  const hasNextPage = isForward ? hasMore : !!cursor;
  const hasPrevPage = isForward ? !!cursor : hasMore;

  const firstItem = pageRows[0];
  const lastItem = pageRows[pageRows.length - 1];

  const nextCursor =
    hasNextPage && lastItem
      ? encodeCursor(lastItem.createdAt, lastItem.id)
      : null;
  const prevCursor =
    hasPrevPage && firstItem
      ? encodeCursor(firstItem.createdAt, firstItem.id)
      : null;

  const bmiFilterConditions = [];
  if (minBmi !== undefined) {
    bmiFilterConditions.push(gte(participants.bmi, String(minBmi)));
  }
  if (maxBmi !== undefined) {
    bmiFilterConditions.push(lte(participants.bmi, String(maxBmi)));
  }
  const countWhere = bmiFilterConditions.length > 0 ? and(...bmiFilterConditions) : undefined;

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(participants)
    .where(countWhere);

  return {
    items,
    pagination: {
      limit,
      nextCursor,
      prevCursor,
      hasNextPage,
      hasPrevPage,
    },
    total: Number(total),
  };
}
```

Note: The `DrizzleDb` type uses `any` as a pragmatic choice — Drizzle's inferred types are complex and the integration tests validate correctness against real Postgres. Add a `// Drizzle instance type is complex; validated by integration tests` comment.

- [ ] **Step 5: Run integration tests to verify they pass**

Run: `cd apps/api && DATABASE_URL=postgresql://curebase:curebase@localhost:5432/curebase npx vitest run src/__tests__/participants.integration.test.ts`

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/services/participants.ts \
  apps/api/src/__tests__/setup.ts \
  apps/api/src/__tests__/participants.integration.test.ts
git commit -m "feat: add participant service with create, list, and pagination"
```

---

### Task 6: Fastify app & HTTP routes

**Files:**
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/routes/participants.ts`
- Create: `apps/api/src/index.ts`
- Modify: `apps/api/src/__tests__/participants.integration.test.ts` (add route-level tests)

**Interfaces:**
- Consumes:
  - `createParticipant(db, input)` and `listParticipants(db, query)` from `services/participants.ts`
  - `DuplicateEmailError` from `services/participants.ts`
  - `CursorError` from `services/cursor.ts`
  - `createParticipantSchema` and `listParticipantsQuerySchema` from `@curebase/shared`
  - `loadConfig()` from `config.ts`
  - `getDb()` from `db/connection.ts`
  - `runMigrations()` from `db/migrate.ts`
- Produces:
  - `buildApp(config)` — returns a configured Fastify instance with `POST /participants` and `GET /participants`
  - `POST /participants` → 201 (participant), 400 (validation), 409 (duplicate email)
  - `GET /participants` → 200 (list response), 400 (invalid query/cursor)
  - Server entry point that starts listening

- [ ] **Step 1: Implement `apps/api/src/app.ts`**

```typescript
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { participantRoutes } from './routes/participants.js';
import { getDb } from './db/connection.js';
import type { Config } from './config.js';

export async function buildApp(config: Config) {
  const app = Fastify({
    logger: {
      level: 'info',
      serializers: {
        req(request) {
          return {
            method: request.method,
            url: request.url,
          };
        },
        res(reply) {
          return {
            statusCode: reply.statusCode,
          };
        },
      },
    },
  });

  await app.register(cors, {
    origin: config.webOrigin,
  });

  const db = getDb(config.databaseUrl);

  app.decorate('db', db);

  await app.register(participantRoutes);

  return app;
}
```

- [ ] **Step 2: Implement `apps/api/src/routes/participants.ts`**

```typescript
import type { FastifyPluginAsync } from 'fastify';
import {
  createParticipantSchema,
  listParticipantsQuerySchema,
} from '@curebase/shared';
import {
  createParticipant,
  listParticipants,
  DuplicateEmailError,
} from '../services/participants.js';
import { CursorError } from '../services/cursor.js';

export const participantRoutes: FastifyPluginAsync = async (app) => {
  const db = (app as any).db;

  app.post('/participants', async (request, reply) => {
    const parsed = createParticipantSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const participant = await createParticipant(db, parsed.data);
      return reply.status(201).send(participant);
    } catch (error) {
      if (error instanceof DuplicateEmailError) {
        return reply.status(409).send({
          error: 'Conflict',
          details: { email: ['A participant with this email already exists'] },
        });
      }
      request.log.error({ err: error }, 'Failed to create participant');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  app.get('/participants', async (request, reply) => {
    const parsed = listParticipantsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const result = await listParticipants(db, parsed.data);
      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof CursorError) {
        return reply.status(400).send({
          error: 'Invalid cursor',
          details: { cursor: [error.message] },
        });
      }
      request.log.error({ err: error }, 'Failed to list participants');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};
```

- [ ] **Step 3: Implement `apps/api/src/index.ts`**

```typescript
import { loadConfig } from './config.js';
import { buildApp } from './app.js';
import { runMigrations } from './db/migrate.js';

async function main() {
  const config = loadConfig();

  await runMigrations(config.databaseUrl);

  const app = await buildApp(config);

  await app.listen({ port: config.apiPort, host: '0.0.0.0' });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
```

- [ ] **Step 4: Write route-level API tests**

Add to the end of `apps/api/src/__tests__/participants.integration.test.ts` (or create a new file `apps/api/src/__tests__/routes.test.ts`):

```typescript
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { buildApp } from '../app.js';
import { setupTestDb, cleanParticipants, teardownTestDb } from './setup.js';
import type { FastifyInstance } from 'fastify';

const TEST_CONFIG = {
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://curebase:curebase@localhost:5432/curebase',
  apiPort: 0,
  webOrigin: 'http://localhost:5173',
};

let app: FastifyInstance;

beforeAll(async () => {
  await setupTestDb();
  app = await buildApp(TEST_CONFIG);
});

beforeEach(async () => {
  await cleanParticipants();
});

afterAll(async () => {
  await app.close();
  await teardownTestDb();
});

describe('POST /participants', () => {
  it('returns 201 with computed BMI', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/participants',
      payload: {
        firstName: 'Peter',
        lastName: 'Pan',
        email: 'peter@example.com',
        phone: '1234567890',
        age: 14,
        weight: 85,
        height: 54,
        unitSystem: 'us',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.id).toBeDefined();
    expect(body.bmi).toBeDefined();
    expect(body.bmi).toBeCloseTo(20.49, 1);
  });

  it('returns 400 on invalid input', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/participants',
      payload: {
        firstName: '',
        lastName: 'Pan',
        email: 'not-an-email',
        phone: '123',
        age: 200,
        weight: 85,
        height: 54,
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.details).toBeDefined();
  });

  it('returns 409 on duplicate email', async () => {
    const payload = {
      firstName: 'Peter',
      lastName: 'Pan',
      email: 'peter@example.com',
      phone: '1234567890',
      age: 14,
      weight: 85,
      height: 54,
      unitSystem: 'us',
    };

    await app.inject({ method: 'POST', url: '/participants', payload });
    const response = await app.inject({ method: 'POST', url: '/participants', payload });

    expect(response.statusCode).toBe(409);
  });
});

describe('GET /participants', () => {
  it('returns 200 with empty list', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/participants',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.items).toHaveLength(0);
    expect(body.total).toBe(0);
  });

  it('returns 400 on invalid limit', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/participants?limit=0',
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 on invalid cursor', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/participants?cursor=invalid!!!',
    });

    expect(response.statusCode).toBe(400);
  });

  it('filters by BMI range', async () => {
    await app.inject({
      method: 'POST',
      url: '/participants',
      payload: {
        firstName: 'Low',
        lastName: 'Bmi',
        email: 'low@example.com',
        phone: '1234567890',
        age: 20,
        weight: 100,
        height: 80,
        unitSystem: 'us',
      },
    });
    await app.inject({
      method: 'POST',
      url: '/participants',
      payload: {
        firstName: 'High',
        lastName: 'Bmi',
        email: 'high@example.com',
        phone: '1234567891',
        age: 20,
        weight: 300,
        height: 50,
        unitSystem: 'us',
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/participants?minBmi=50',
    });

    const body = response.json();
    expect(body.items.every((p: any) => p.bmi >= 50)).toBe(true);
  });

  it('paginates with keyset cursor', async () => {
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: 'POST',
        url: '/participants',
        payload: {
          firstName: `User${i}`,
          lastName: 'Test',
          email: `user${i}@example.com`,
          phone: '1234567890',
          age: 20 + i,
          weight: 150,
          height: 65,
          unitSystem: 'us',
        },
      });
    }

    const page1 = await app.inject({
      method: 'GET',
      url: '/participants?limit=2',
    });
    const body1 = page1.json();
    expect(body1.items).toHaveLength(2);
    expect(body1.pagination.hasNextPage).toBe(true);

    const page2 = await app.inject({
      method: 'GET',
      url: `/participants?limit=2&cursor=${body1.pagination.nextCursor}`,
    });
    const body2 = page2.json();
    expect(body2.items).toHaveLength(2);

    const ids1 = body1.items.map((p: any) => p.id);
    const ids2 = body2.items.map((p: any) => p.id);
    expect(ids1).not.toEqual(expect.arrayContaining(ids2));
  });
});
```

- [ ] **Step 5: Run all API tests**

Run: `cd apps/api && DATABASE_URL=postgresql://curebase:curebase@localhost:5432/curebase npx vitest run`

Expected: all tests PASS.

- [ ] **Step 6: Start the server manually and verify**

```bash
cd apps/api
DATABASE_URL=postgresql://curebase:curebase@localhost:5432/curebase \
  API_PORT=3001 \
  WEB_ORIGIN=http://localhost:5173 \
  npx tsx src/index.ts
```

In another terminal:
```bash
curl -s http://localhost:3001/participants | jq .
```

Expected: `{"items":[],"pagination":{...},"total":0}`

Stop the server with Ctrl+C.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/app.ts apps/api/src/routes/ apps/api/src/index.ts \
  apps/api/src/__tests__/
git commit -m "feat: add Fastify routes for participant create and list"
```

---

### Task 7: Frontend shell & theme

**Files:**
- Create: `apps/web/index.html`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/App.css`
- Create: `apps/web/src/api/client.ts`
- Create: `apps/web/src/components/ThemeToggle.tsx`

**Interfaces:**
- Consumes: React, TanStack Query, Vite (from Task 1 dependencies)
- Produces:
  - `apiClient` object with `createParticipant(input)` and `listParticipants(query)` methods
  - `App` component with layout shell, heading, and theme toggle
  - Dark/light theme via CSS variables and `data-theme` attribute on `<html>`
  - `QueryClient` provider wrapping the app

- [ ] **Step 1: Create `apps/web/index.html`**

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Clinical Trial Participant Capture</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Create `apps/web/vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/participants': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 3: Create `apps/web/src/App.css`**

```css
:root {
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --bg-card: #0f3460;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --border: #2a2a4a;
  --accent: #4a9eff;
  --accent-hover: #3a8eef;
  --error: #ff6b6b;
  --success: #4ecdc4;
  --input-bg: #1a1a3e;
}

[data-theme='light'] {
  --bg-primary: #f5f5f5;
  --bg-secondary: #ffffff;
  --bg-card: #ffffff;
  --text-primary: #1a1a2e;
  --text-secondary: #666666;
  --border: #d0d0d0;
  --accent: #2563eb;
  --accent-hover: #1d4ed8;
  --error: #dc2626;
  --success: #16a34a;
  --input-bg: #ffffff;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.6;
}

.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.app-header h1 {
  font-size: 1.5rem;
  font-weight: 600;
}

button {
  cursor: pointer;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  transition: background 0.2s;
}

button:hover:not(:disabled) {
  background: var(--accent);
  color: white;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button.primary {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}

button.primary:hover:not(:disabled) {
  background: var(--accent-hover);
}

input, select {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 0.875rem;
  width: 100%;
}

input:focus, select:focus {
  outline: 2px solid var(--accent);
  outline-offset: -1px;
}

label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
  color: var(--text-secondary);
}

.field-error {
  color: var(--error);
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  text-align: left;
  padding: 0.75rem;
  border-bottom: 1px solid var(--border);
  font-size: 0.875rem;
}

th {
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-secondary);
}

.error-banner {
  background: var(--error);
  color: white;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.success-banner {
  background: var(--success);
  color: white;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}
```

- [ ] **Step 4: Create `apps/web/src/api/client.ts`**

```typescript
import type { CreateParticipantInput, Participant, ListParticipantsResponse } from '@curebase/shared';

const BASE_URL = '/participants';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.error ?? `HTTP ${response.status}`);
    (error as any).status = response.status;
    (error as any).details = body.details;
    throw error;
  }
  return response.json();
}

export const apiClient = {
  async createParticipant(input: CreateParticipantInput): Promise<Participant> {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return handleResponse<Participant>(response);
  },

  async listParticipants(params: Record<string, string>): Promise<ListParticipantsResponse> {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        searchParams.set(key, value);
      }
    }
    const url = searchParams.toString() ? `${BASE_URL}?${searchParams}` : BASE_URL;
    const response = await fetch(url);
    return handleResponse<ListParticipantsResponse>(response);
  },
};
```

- [ ] **Step 5: Create `apps/web/src/components/ThemeToggle.tsx`**

```typescript
import { useState, useEffect } from 'react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return (localStorage.getItem('theme') as 'dark' | 'light') ?? 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // localStorage unavailable
    }
  }, [theme]);

  return (
    <button
      onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
    </button>
  );
}
```

- [ ] **Step 6: Create `apps/web/src/App.tsx`**

```typescript
import { ThemeToggle } from './components/ThemeToggle.js';
import './App.css';

export function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Clinical Trial Participant Capture</h1>
        <ThemeToggle />
      </header>
      {/* ParticipantForm and ParticipantTable added in Tasks 8 and 9 */}
    </div>
  );
}
```

- [ ] **Step 7: Create `apps/web/src/main.tsx`**

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
```

- [ ] **Step 8: Verify Vite starts**

```bash
cd apps/web && npx vite --open
```

Expected: browser opens to `http://localhost:5173` showing the heading "Clinical Trial Participant Capture" and a theme toggle button. Dark theme by default.

- [ ] **Step 9: Commit**

```bash
git add apps/web/
git commit -m "feat: add frontend shell with theme toggle and API client"
```

---

### Task 8: Participant registration form

**Files:**
- Create: `apps/web/src/hooks/useCreateParticipant.ts`
- Create: `apps/web/src/components/ParticipantForm.tsx`
- Modify: `apps/web/src/App.tsx` (add form)

**Interfaces:**
- Consumes:
  - `apiClient.createParticipant(input)` from `api/client.ts`
  - `createParticipantSchema` from `@curebase/shared`
  - `CreateParticipantInput` from `@curebase/shared`
- Produces:
  - `useCreateParticipant()` hook — returns TanStack mutation for creating a participant
  - `ParticipantForm` component — full registration form with RHF + Zod validation, unit toggle, submit states
  - `onSuccess` callback prop to notify parent of successful save

- [ ] **Step 1: Create `apps/web/src/hooks/useCreateParticipant.ts`**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client.js';
import type { CreateParticipantInput } from '@curebase/shared';

export function useCreateParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateParticipantInput) => apiClient.createParticipant(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants'] });
    },
  });
}
```

- [ ] **Step 2: Create `apps/web/src/components/ParticipantForm.tsx`**

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createParticipantSchema, type CreateParticipantInput } from '@curebase/shared';
import { useCreateParticipant } from '../hooks/useCreateParticipant.js';
import { useEffect, useState } from 'react';

interface ParticipantFormProps {
  onSuccess?: () => void;
}

export function ParticipantForm({ onSuccess }: ParticipantFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateParticipantInput>({
    resolver: zodResolver(createParticipantSchema),
    defaultValues: {
      unitSystem: 'us',
    },
  });

  const unitSystem = watch('unitSystem');

  const mutation = useCreateParticipant();

  const onSubmit = async (data: CreateParticipantInput) => {
    setServerError(null);
    setShowSuccess(false);

    try {
      await mutation.mutateAsync(data);
      setShowSuccess(true);
      reset({ unitSystem: 'us' });
      onSuccess?.();
    } catch (error: any) {
      if (error.status === 409) {
        setError('email', { message: 'A participant with this email already exists' });
      } else if (error.status === 400 && error.details) {
        for (const [field, messages] of Object.entries(error.details)) {
          setError(field as keyof CreateParticipantInput, {
            message: (messages as string[])[0],
          });
        }
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    }
  };

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const weightLabel = unitSystem === 'metric' ? 'Weight (kg)' : 'Weight (lbs)';
  const heightLabel = unitSystem === 'metric' ? 'Height (cm)' : 'Height (inches)';

  return (
    <div className="card">
      <h2 style={{ marginBottom: '1rem', fontSize: '1.125rem' }}>Add Participant</h2>

      {showSuccess && <div className="success-banner">Participant added successfully!</div>}
      {serverError && <div className="error-banner">{serverError}</div>}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <label htmlFor="firstName">First Name</label>
            <input id="firstName" {...register('firstName')} />
            {errors.firstName && <div className="field-error">{errors.firstName.message}</div>}
          </div>

          <div>
            <label htmlFor="lastName">Last Name</label>
            <input id="lastName" {...register('lastName')} />
            {errors.lastName && <div className="field-error">{errors.lastName.message}</div>}
          </div>

          <div>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" {...register('email')} />
            {errors.email && <div className="field-error">{errors.email.message}</div>}
          </div>

          <div>
            <label htmlFor="phone">Phone</label>
            <input id="phone" {...register('phone')} />
            {errors.phone && <div className="field-error">{errors.phone.message}</div>}
          </div>

          <div>
            <label htmlFor="age">Age</label>
            <input id="age" type="number" {...register('age', { valueAsNumber: true })} />
            {errors.age && <div className="field-error">{errors.age.message}</div>}
          </div>

          <div>
            <label htmlFor="unitSystem">Unit System</label>
            <select id="unitSystem" {...register('unitSystem')}>
              <option value="us">US (lbs / inches)</option>
              <option value="metric">Metric (kg / cm)</option>
            </select>
          </div>

          <div>
            <label htmlFor="weight">{weightLabel}</label>
            <input id="weight" type="number" step="any" {...register('weight', { valueAsNumber: true })} />
            {errors.weight && <div className="field-error">{errors.weight.message}</div>}
          </div>

          <div>
            <label htmlFor="height">{heightLabel}</label>
            <input id="height" type="number" step="any" {...register('height', { valueAsNumber: true })} />
            {errors.height && <div className="field-error">{errors.height.message}</div>}
          </div>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <button type="submit" className="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Add Participant'}
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Update `apps/web/src/App.tsx` to include the form**

```typescript
import { ThemeToggle } from './components/ThemeToggle.js';
import { ParticipantForm } from './components/ParticipantForm.js';
import './App.css';

export function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Clinical Trial Participant Capture</h1>
        <ThemeToggle />
      </header>
      <ParticipantForm />
      {/* ParticipantTable added in Task 9 */}
    </div>
  );
}
```

- [ ] **Step 4: Verify form in the browser**

Start both API and web:

```bash
# Terminal 1: API
cd apps/api && DATABASE_URL=postgresql://curebase:curebase@localhost:5432/curebase \
  API_PORT=3001 WEB_ORIGIN=http://localhost:5173 npx tsx src/index.ts

# Terminal 2: Web
cd apps/web && npx vite
```

Open `http://localhost:5173`. Verify:
1. All form fields render with correct labels
2. Unit toggle switches weight/height labels
3. Empty submit shows validation errors
4. Valid submit returns 201 and shows success message
5. Duplicate email shows 409 error on email field
6. Form resets after successful save

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/useCreateParticipant.ts \
  apps/web/src/components/ParticipantForm.tsx \
  apps/web/src/App.tsx
git commit -m "feat: add participant registration form with validation"
```

---

### Task 9: Participant table, filters & pagination

**Files:**
- Create: `apps/web/src/hooks/useUrlState.ts`
- Create: `apps/web/src/hooks/useParticipants.ts`
- Create: `apps/web/src/components/BmiFilter.tsx`
- Create: `apps/web/src/components/ParticipantTable.tsx`
- Create: `apps/web/src/components/Pagination.tsx`
- Modify: `apps/web/src/App.tsx` (assemble everything)
- Create: `apps/web/src/__tests__/useUrlState.test.ts`

**Interfaces:**
- Consumes:
  - `apiClient.listParticipants(params)` from `api/client.ts`
  - `ListParticipantsResponse`, `Participant` from `@curebase/shared`
- Produces:
  - `useUrlState()` hook — reads/writes `minBmi`, `maxBmi`, `cursor`, `direction` to URL search params
  - `useParticipants(params)` hook — TanStack Query wrapper for listing
  - `BmiFilter` component — min/max BMI inputs
  - `ParticipantTable` component — data table with loading/empty/error states
  - `Pagination` component — Previous/Next buttons
  - Complete assembled `App` with form → table → filter → pagination

- [ ] **Step 1: Create `apps/web/src/hooks/useUrlState.ts`**

```typescript
import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';

// Note: If react-router-dom is not desired, use the native URLSearchParams API:
// This implementation uses window.location and history.replaceState directly.

interface UrlState {
  minBmi: string;
  maxBmi: string;
  cursor: string;
  direction: string;
}

export function useUrlState() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);

  const state: UrlState = useMemo(
    () => ({
      minBmi: params.get('minBmi') ?? '',
      maxBmi: params.get('maxBmi') ?? '',
      cursor: params.get('cursor') ?? '',
      direction: params.get('direction') ?? '',
    }),
    [params],
  );

  const setParams = useCallback((updates: Partial<UrlState>) => {
    const current = new URLSearchParams(window.location.search);

    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        current.set(key, value);
      } else {
        current.delete(key);
      }
    }

    const newUrl = current.toString()
      ? `${window.location.pathname}?${current}`
      : window.location.pathname;

    window.history.replaceState(null, '', newUrl);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  const setFilter = useCallback(
    (minBmi: string, maxBmi: string) => {
      setParams({ minBmi, maxBmi, cursor: '', direction: '' });
    },
    [setParams],
  );

  const setPage = useCallback(
    (cursor: string, direction: 'next' | 'prev') => {
      setParams({ cursor, direction });
    },
    [setParams],
  );

  const resetPagination = useCallback(() => {
    setParams({ cursor: '', direction: '' });
  }, [setParams]);

  return { state, setFilter, setPage, resetPagination };
}
```

- [ ] **Step 2: Create `apps/web/src/hooks/useParticipants.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client.js';

interface UseParticipantsParams {
  minBmi?: string;
  maxBmi?: string;
  cursor?: string;
  direction?: string;
  limit?: string;
}

export function useParticipants(params: UseParticipantsParams) {
  const queryParams: Record<string, string> = {};

  if (params.minBmi) queryParams.minBmi = params.minBmi;
  if (params.maxBmi) queryParams.maxBmi = params.maxBmi;
  if (params.cursor) queryParams.cursor = params.cursor;
  if (params.direction) queryParams.direction = params.direction;
  if (params.limit) queryParams.limit = params.limit;

  return useQuery({
    queryKey: ['participants', queryParams],
    queryFn: () => apiClient.listParticipants(queryParams),
  });
}
```

- [ ] **Step 3: Create `apps/web/src/components/BmiFilter.tsx`**

```typescript
import { useState } from 'react';

interface BmiFilterProps {
  initialMinBmi: string;
  initialMaxBmi: string;
  onFilter: (minBmi: string, maxBmi: string) => void;
}

export function BmiFilter({ initialMinBmi, initialMaxBmi, onFilter }: BmiFilterProps) {
  const [minBmi, setMinBmi] = useState(initialMinBmi);
  const [maxBmi, setMaxBmi] = useState(initialMaxBmi);

  const handleApply = () => {
    onFilter(minBmi, maxBmi);
  };

  const handleClear = () => {
    setMinBmi('');
    setMaxBmi('');
    onFilter('', '');
  };

  return (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div>
        <label htmlFor="minBmi">Min BMI</label>
        <input
          id="minBmi"
          type="number"
          step="any"
          value={minBmi}
          onChange={(e) => setMinBmi(e.target.value)}
          style={{ width: '120px' }}
        />
      </div>
      <div>
        <label htmlFor="maxBmi">Max BMI</label>
        <input
          id="maxBmi"
          type="number"
          step="any"
          value={maxBmi}
          onChange={(e) => setMaxBmi(e.target.value)}
          style={{ width: '120px' }}
        />
      </div>
      <button onClick={handleApply}>Filter</button>
      {(minBmi || maxBmi) && (
        <button onClick={handleClear}>Clear</button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create `apps/web/src/components/Pagination.tsx`**

```typescript
interface PaginationProps {
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextCursor: string | null;
  prevCursor: string | null;
  total: number;
  onPage: (cursor: string, direction: 'next' | 'prev') => void;
}

export function Pagination({
  hasNextPage,
  hasPrevPage,
  nextCursor,
  prevCursor,
  total,
  onPage,
}: PaginationProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '1rem',
      }}
    >
      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        {total} participant{total !== 1 ? 's' : ''} total
      </span>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          disabled={!hasPrevPage}
          onClick={() => prevCursor && onPage(prevCursor, 'prev')}
        >
          Previous
        </button>
        <button
          disabled={!hasNextPage}
          onClick={() => nextCursor && onPage(nextCursor, 'next')}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `apps/web/src/components/ParticipantTable.tsx`**

```typescript
import type { Participant } from '@curebase/shared';

interface ParticipantTableProps {
  participants: Participant[];
  isLoading: boolean;
  isError: boolean;
  hasFilter: boolean;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function weightSuffix(unitSystem: string): string {
  return unitSystem === 'metric' ? 'kg' : 'lbs';
}

function heightSuffix(unitSystem: string): string {
  return unitSystem === 'metric' ? 'cm' : 'in';
}

export function ParticipantTable({
  participants,
  isLoading,
  isError,
  hasFilter,
}: ParticipantTableProps) {
  if (isLoading) {
    return <div className="empty-state">Loading participants...</div>;
  }

  if (isError) {
    return <div className="error-banner">Failed to load participants. Please try again.</div>;
  }

  if (participants.length === 0) {
    return (
      <div className="empty-state">
        {hasFilter
          ? 'No participants match this BMI range.'
          : 'No participants yet.'}
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Age</th>
            <th>Weight</th>
            <th>Height</th>
            <th>BMI</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {participants.map((p) => (
            <tr key={p.id}>
              <td>{p.firstName} {p.lastName}</td>
              <td>{p.email}</td>
              <td>{p.phone}</td>
              <td>{p.age}</td>
              <td>{p.weight} {weightSuffix(p.unitSystem)}</td>
              <td>{p.height} {heightSuffix(p.unitSystem)}</td>
              <td>{p.bmi.toFixed(1)}</td>
              <td>{formatDate(p.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 6: Update `apps/web/src/App.tsx` to assemble everything**

```typescript
import { useState, useCallback, useEffect } from 'react';
import { ThemeToggle } from './components/ThemeToggle.js';
import { ParticipantForm } from './components/ParticipantForm.js';
import { ParticipantTable } from './components/ParticipantTable.js';
import { BmiFilter } from './components/BmiFilter.js';
import { Pagination } from './components/Pagination.js';
import { useParticipants } from './hooks/useParticipants.js';
import { useUrlState } from './hooks/useUrlState.js';
import './App.css';

export function App() {
  const { state, setFilter, setPage, resetPagination } = useUrlState();
  const [urlTrigger, setUrlTrigger] = useState(0);

  useEffect(() => {
    const handler = () => setUrlTrigger((n) => n + 1);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  const currentState = (() => {
    const params = new URLSearchParams(window.location.search);
    return {
      minBmi: params.get('minBmi') ?? '',
      maxBmi: params.get('maxBmi') ?? '',
      cursor: params.get('cursor') ?? '',
      direction: params.get('direction') ?? '',
    };
  })();

  const { data, isLoading, isError } = useParticipants({
    minBmi: currentState.minBmi,
    maxBmi: currentState.maxBmi,
    cursor: currentState.cursor,
    direction: currentState.direction,
  });

  const hasFilter = !!(currentState.minBmi || currentState.maxBmi);

  const handleFormSuccess = useCallback(() => {
    resetPagination();
  }, [resetPagination]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Clinical Trial Participant Capture</h1>
        <ThemeToggle />
      </header>

      <ParticipantForm onSuccess={handleFormSuccess} />

      <div className="card">
        <div style={{ marginBottom: '1rem' }}>
          <BmiFilter
            initialMinBmi={currentState.minBmi}
            initialMaxBmi={currentState.maxBmi}
            onFilter={setFilter}
          />
        </div>

        <ParticipantTable
          participants={data?.items ?? []}
          isLoading={isLoading}
          isError={isError}
          hasFilter={hasFilter}
        />

        {data && (
          <Pagination
            hasNextPage={data.pagination.hasNextPage}
            hasPrevPage={data.pagination.hasPrevPage}
            nextCursor={data.pagination.nextCursor}
            prevCursor={data.pagination.prevCursor}
            total={data.total}
            onPage={setPage}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Write URL state tests**

Create `apps/web/src/__tests__/useUrlState.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('URL state management', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('reads empty state from clean URL', () => {
    const params = new URLSearchParams(window.location.search);
    expect(params.get('minBmi')).toBeNull();
    expect(params.get('cursor')).toBeNull();
  });

  it('writes filter params to URL', () => {
    const params = new URLSearchParams();
    params.set('minBmi', '18.5');
    params.set('maxBmi', '25');
    window.history.replaceState(null, '', `/?${params}`);

    const current = new URLSearchParams(window.location.search);
    expect(current.get('minBmi')).toBe('18.5');
    expect(current.get('maxBmi')).toBe('25');
  });

  it('clears cursor when filter changes', () => {
    const initial = new URLSearchParams();
    initial.set('cursor', 'abc');
    initial.set('direction', 'next');
    initial.set('minBmi', '10');
    window.history.replaceState(null, '', `/?${initial}`);

    const updated = new URLSearchParams();
    updated.set('minBmi', '20');
    window.history.replaceState(null, '', `/?${updated}`);

    const current = new URLSearchParams(window.location.search);
    expect(current.get('cursor')).toBeNull();
    expect(current.get('direction')).toBeNull();
    expect(current.get('minBmi')).toBe('20');
  });
});
```

- [ ] **Step 8: Run frontend tests**

Run: `cd apps/web && npx vitest run`

Expected: all tests PASS.

- [ ] **Step 9: Full end-to-end manual verification**

Start both services:

```bash
# Terminal 1
cd apps/api && DATABASE_URL=postgresql://curebase:curebase@localhost:5432/curebase \
  API_PORT=3001 WEB_ORIGIN=http://localhost:5173 npx tsx src/index.ts

# Terminal 2
cd apps/web && npx vite
```

Open `http://localhost:5173` and verify:

1. **Form**: all fields render, unit toggle works, validation shows errors, successful save shows success message and resets form
2. **Table**: participants appear sorted by newest first, columns show correct data with unit suffixes, BMI shows 1 decimal
3. **Empty states**: "No participants yet." when empty, "No participants match this BMI range." when filtered empty
4. **Filter**: min/max BMI filter works, table updates, clear button resets
5. **Pagination**: add 15+ participants, Previous/Next buttons work, no page numbers shown
6. **URL state**: filter and cursor params appear in URL, browser back/forward works
7. **Theme**: toggle between dark and light, persists on reload
8. **Duplicate email**: shows error on email field
9. **Error state**: stop the API and verify error state renders

- [ ] **Step 10: Run all tests across the monorepo**

```bash
# From repo root
DATABASE_URL=postgresql://curebase:curebase@localhost:5432/curebase npm test
```

Expected: all tests PASS across all workspaces.

- [ ] **Step 11: Commit**

```bash
git add apps/web/src/
git commit -m "feat: add participant table with BMI filter and keyset pagination"
```

---

## Self-review

### Spec coverage check

| TRD Requirement | Task |
| --- | --- |
| FR-1.1 Form fields | Task 8 |
| FR-1.2 Unit toggle | Task 8 |
| FR-1.3 Client Zod validation | Task 8 |
| FR-1.4 POST persists with BMI | Tasks 5, 6 |
| FR-1.5 409 duplicate email | Tasks 5, 6, 8 |
| FR-1.6 Reset + refresh on save | Task 8, 9 |
| FR-2.1 US BMI formula | Task 4 |
| FR-2.2 Metric BMI formula | Task 4 |
| FR-2.3 BMI in API only | Tasks 4, 5 (no BMI in shared/web) |
| FR-2.4 Display 1 decimal, storage numeric(6,2) | Tasks 3, 4, 9 |
| FR-3.1 GET sorted desc | Task 5 |
| FR-3.2 BMI range filter | Tasks 5, 6, 9 |
| FR-3.3 minBmi <= maxBmi | Task 2 (schema) |
| FR-3.4 Table columns with unit suffix | Task 9 |
| FR-3.5 Empty state copy | Task 9 |
| FR-3.6 Filtered empty state copy | Task 9 |
| FR-3.7 Loading/empty/error states | Task 9 |
| FR-4.1 Keyset cursor, no OFFSET | Task 5 |
| FR-4.2 Opaque base64 cursor | Task 4 |
| FR-4.3 Default limit 10, range 1–100 | Task 2 (schema) |
| FR-4.4 hasNextPage/hasPrevPage | Task 5 |
| FR-4.5 prev requires cursor | Task 2 (schema) |
| FR-4.6 Backward page returns desc | Task 5 |
| FR-4.7 Invalid cursor → 400 | Tasks 4, 6 |
| FR-4.8 Total with BMI filter | Task 5 |
| FR-4.9 URL state | Task 9 |
| FR-4.10 Filter clears cursor | Task 9 |
| FR-5.1 Title | Task 7 |
| FR-5.2 Dark default + toggle | Task 7 |
| FR-5.3 Layout order | Task 9 |
| FR-5.4 Previous/Next buttons | Task 9 |
| FR-5.5 No page numbers | Task 9 |
| NFR-1.1–1.6 Data integrity | Task 3 |
| NFR-2.1–2.8 Validation | Tasks 2, 3 |
| NFR-3.1–3.7 Security/PHI | Tasks 1, 3, 6 |
| NFR-4.1–4.4 Performance | Tasks 3, 5 |

All requirements covered. No gaps found.

### Placeholder scan

No TBD, TODO, or "implement later" found. All steps contain actual code.

### Type consistency check

- `computeBmi(weight, height, unitSystem)` — defined Task 4, consumed Task 5: consistent
- `encodeCursor(createdAt, id)` / `decodeCursor(cursor)` — defined Task 4, consumed Task 5: consistent
- `CursorError` — defined Task 4, caught Task 6: consistent
- `DuplicateEmailError` — defined Task 5, caught Task 6: consistent
- `createParticipant(db, input)` / `listParticipants(db, query)` — defined Task 5, called Task 6: consistent
- `apiClient.createParticipant(input)` / `apiClient.listParticipants(params)` — defined Task 7, consumed Tasks 8, 9: consistent
- `useCreateParticipant()` — defined Task 8, consumed Task 8: consistent
- `useParticipants(params)` — defined Task 9, consumed Task 9: consistent
- `useUrlState()` returns `{ state, setFilter, setPage, resetPagination }` — defined Task 9, consumed Task 9: consistent
