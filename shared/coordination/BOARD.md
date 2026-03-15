# Coordination Board

Read this file before starting work. Claim a workstream or task by writing your session ID.

## Active Workstreams

| ID | Name | Status | Contract | Workstream File |
|----|------|--------|----------|-----------------|
| ws-001 | Auth Security (2FA/TOTP, Email Verify, Recovery) | in-progress | rest:auth-security | [ws-001.md](workstreams/ws-001.md) |
| ws-003 | Logged-In UI Redesign — Professional Dashboard Experience | complete | (frontend-only) | [ws-003.md](workstreams/ws-003.md) |
| ws-004 | Production Auto-Recovery & Self-Healing System | in-progress | rest:health,watchdog,status | [ws-004.md](workstreams/ws-004.md) |
| ws-005 | MQTT Agent Fleet Monitoring & Management | planned | mqtt+rest:fleet | [ws-005.md](workstreams/ws-005.md) |

## Recently Completed

| ID | Name | Completed | Notes |
|----|------|-----------|-------|
| ws-002 | Enterprise Readiness — Phase 1 | 2026-03-15 | 16/16 tasks done — SAML, SCIM, API keys, audit forwarding, rate limiting, encryption at rest |

## Rules

1. Read this file before starting work
2. Claim a workstream/task by writing your session ID into the table
3. If a workstream has tasks, check its workstream file before starting
4. Contracts are defined BEFORE implementation — never implement without a contract reference
5. When done, move the row to Recently Completed
