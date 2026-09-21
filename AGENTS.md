# CareOps Engineering Instructions

## Mission

Build a production-oriented healthcare SaaS demonstration called CareOps.

Optimize for:
1. Correctness
2. Security
3. Maintainability
4. Observable performance
5. Clear architectural tradeoffs
6. Interview demonstrability

## Repository boundaries

- `careops-web`: React frontend only.
- `careops-api`: HTTP API and business/domain logic.
- `careops-worker`: asynchronous processing consumers/workers.
- `careops-infra`: Terraform, Kubernetes manifests, deployment configuration and AWS infrastructure.

Do not move business logic between repositories merely to make implementation easier.

## Architecture

- React/TypeScript -> ALB/WAF -> Node.js API on ECS/Fargate.
- API uses RDS PostgreSQL, Redis, S3 and SQS.
- SQS drives asynchronous workers running on EKS.
- RDS must not be publicly exposed.
- S3 objects must not be public.
- Infrastructure is managed with Terraform.

## Security

Treat patient demographics, clinical notes, diagnoses, insurance information and healthcare documents as PHI.

Never:
- log PHI
- commit secrets
- expose S3 objects publicly
- trust frontend authorization
- allow cross-tenant access
- concatenate user-controlled SQL

Every protected API resource must enforce:
1. authentication
2. tenant authorization
3. resource authorization
4. role/permission checks where applicable

Record relevant PHI access in the audit system without unnecessarily copying PHI into the audit payload.

## PostgreSQL

- Use constraints and foreign keys.
- Design indexes from real access patterns.
- Use parameterized queries.
- Avoid N+1 queries.
- Analyze important queries with `EXPLAIN (ANALYZE, BUFFERS)`.
- Do not add indexes without understanding write/storage cost.
- Large schema changes must use an expand/contract strategy when appropriate.
- Large backfills must be batched and observable.

## TypeScript

- Strict TypeScript.
- Avoid `any`; justify exceptional cases.
- Validate external input.
- Keep controllers thin.
- Put business logic in services/domain components.
- Use explicit error handling.
- Prefer small cohesive modules.

## React

- TypeScript.
- React Query/TanStack Query for server state.
- React Hook Form + Zod where appropriate.
- Loading, empty and error states are required.
- Frontend authorization is UX only; backend authorization is authoritative.

## Testing

Changes should include appropriate tests.

Prioritize:
- authorization
- tenant isolation
- security boundaries
- database behavior
- migrations
- API contracts
- critical business rules

Do not chase arbitrary coverage percentages at the expense of meaningful tests.

## AWS

Use:
- ECS/Fargate for the API
- EKS for workers
- RDS PostgreSQL
- S3 for documents
- SQS for asynchronous work
- IAM least privilege
- KMS
- Secrets Manager
- CloudWatch
- CloudTrail
- WAF where appropriate

Do not add AWS services solely because they appear on the job description. Every service must have a documented reason.

## Interview quality

When implementing a significant architectural decision, document:
- problem
- options considered
- chosen approach
- tradeoffs
- operational consequences

Prefer evidence over claims. Measure performance rather than inventing numbers.

## Git

- Small atomic commits.
- Commit messages <= 10 words.
- Do not add AI/tool attribution to commits.
- Never commit secrets, local credentials, generated PHI, or production data.
