# Backlog

Items here are not yet planned. To start work, create a workstream file and add it to BOARD.md.

## Items

### [BL-003] Prometheus Metrics Endpoint
**Priority:** high
**Added:** 2026-03-15
**Description:** Expose a `/metrics` endpoint on each service in Prometheus exposition format. Surfaces latency histograms, error counters, throughput, and active connections already tracked by `MetricsStore`. Enables DevOps teams to scrape with standard Prometheus/Grafana stacks.
**Depends on:** --
**Scope:** backend, infra

### [BL-004] Tenant-Facing Usage Query API
**Priority:** high
**Added:** 2026-03-15
**Description:** REST endpoints for tenants to query their own usage: tool calls, token consumption, cost units, seat utilization, agent registrations. Supports date ranges, grouping by day/week/month, and CSV export. Builds on existing `TenantUsage` and `TokenAccumulator` internals.
**Depends on:** --
**Scope:** backend, api

### [BL-005] Webhook Delivery System
**Priority:** medium
**Added:** 2026-03-15
**Description:** Managed webhook delivery to tenant-configured HTTPS endpoints. Events: incident created/resolved, alert fired, agent registered/deregistered, audit threshold exceeded. Includes exponential backoff retry (3 attempts), dead-letter queue, delivery log, and signature verification (HMAC-SHA256).
**Depends on:** BL-004 (usage API for alert thresholds)
**Scope:** backend, infra

### [BL-006] Custom Alert Rules API
**Priority:** medium
**Added:** 2026-03-15
**Description:** Tenant-facing API to define alert rules on metrics thresholds (e.g., error rate >5% for 5min, cost >$X/day). Alert delivery via webhook (BL-005). Supports create/update/delete/list rules, mute windows, and escalation chains.
**Depends on:** BL-003 (Prometheus metrics), BL-005 (webhook delivery)
**Scope:** backend, api

### [BL-002] Admin/Dashboard/Governance UI
**Priority:** high
**Added:** 2026-03-15
**Description:** Design and implement admin dashboard for governance controls, account management, and system monitoring. Requires both UI design work and API integration with existing governance crates.
**Depends on:** --
**Scope:** frontend, api, governance

### [BL-007] Open-Source Live Feed — Redacted Community Activity
**Priority:** medium
**Added:** 2026-03-15
**Description:** Users on the open-source/free tier automatically contribute anonymized activity events to the public live feed on the homepage. All enforcement actions (blocked, allowed, rate-limited, policy violations, etc.) are posted in real-time, but with full data redaction: IP addresses, user/agent names, tenant IDs, file paths, and any PII are stripped or replaced with generic placeholders before publishing. This creates a "pulse of the network" view showing real-world agent security activity without exposing any user data. Requires: (1) event pipeline from Shield/Gateway that emits redacted copies of enforcement events, (2) redaction layer that strips all identifying fields before the event leaves the user's environment, (3) opt-in consent flow in the open-source setup, (4) WebSocket or SSE endpoint to stream redacted events to the homepage AgentFeed component, (5) rate limiting to prevent feed spam.
**Depends on:** BL-005 (webhook delivery for event transport)
**Scope:** backend, frontend, infra, api
