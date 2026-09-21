# CareOps Interview Demo Runbook

## 30-minute flow

### 1. Architecture — 3 minutes

Show the system diagram.

Explain:
- React
- ALB/WAF
- ECS API
- RDS
- S3
- SQS
- EKS workers

Focus on why ECS and EKS have different responsibilities.

### 2. PostgreSQL — 5 minutes

Show:
- schema
- tenant relationships
- indexes
- constraints

Then demonstrate an inefficient query and EXPLAIN ANALYZE before/after.

Use actual measured numbers.

### 3. Migration — 4 minutes

Show an expand/contract migration.

Explain:
- locking
- batching
- backwards compatibility
- rollback/recovery

### 4. Security — 5 minutes

Demonstrate:
- authentication
- RBAC
- tenant isolation
- resource authorization
- audit event

Attempt a cross-tenant request and show it being rejected.

### 5. PHI — 3 minutes

Explain:
- what data is treated as PHI
- encryption
- secrets
- logging restrictions
- S3 protection
- auditability

Do not claim the demo itself is legally HIPAA compliant.

### 6. AWS — 4 minutes

Explain:
- ECS
- EKS
- RDS
- S3
- SQS
- IAM/KMS/Secrets Manager
- observability

### 7. Tradeoffs — 6 minutes

Be prepared to discuss:
- modular monolith vs microservices
- ECS vs EKS
- read replicas
- Redis caching
- consistency
- migration strategies
- scaling PostgreSQL
- failure handling
- cost vs operational complexity
