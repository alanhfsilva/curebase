# CareOps — Cursor Project Configuration

This configuration is intended for a multi-repository healthcare SaaS interview project.

Repositories:
- careops-web — React + TypeScript frontend
- careops-api — Node.js + TypeScript modular monolith
- careops-worker — async SQS/EKS workers
- careops-infra — Terraform/AWS infrastructure

## How to use

1. Create a parent workspace containing the four repositories.
2. Copy `.cursor/rules/` and `AGENTS.md` into the relevant repository/workspace as appropriate.
3. Keep application code, infrastructure, tests, and documentation aligned with these rules.
4. Use the project skills under `.cursor/skills/` as task-specific guidance.

## Primary interview objectives

- Deep TypeScript/Node.js and React expertise
- PostgreSQL schema design and query optimization
- Production-safe database migrations
- AWS ECS, EKS, and RDS
- PHI-aware security and tenant isolation
- Testing and observability
- Clear architecture and engineering tradeoffs

This is a technical demonstration project. Do not claim that the application is HIPAA compliant merely because technical controls are implemented.
