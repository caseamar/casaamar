# ADR-025 — Dependency and Human Review Control

**Status:** Accepted — v2026.07.24.325

## Context
The governed capability orchestrator introduced explicit execution states and adapter control, but declared capability dependencies were still informational and manual-review executions had no governed completion path. This allowed an implementation to bypass the platform value chain or treat a review-required result as an operational dead end.

## Decision
The orchestrator now blocks execution until every declared dependency is supported by a completed execution with evidence and matching correlation context. Explicit execution references may be supplied, but they are validated against capability, status, evidence and correlation.

Manual-review executions can only complete through an explicit review decision containing reviewer identity and evidence. Approval completes the execution; rejection fails it. Organisational role names remain assignments and do not become architectural dependencies.

## Consequences
- Capability chains are executable rather than documentary.
- Missing or stale dependency evidence fails closed.
- Human control is explicit, auditable and testable.
- Review decisions cannot silently bypass evidence requirements.
- Existing capability contracts and service adapters remain compatible.
