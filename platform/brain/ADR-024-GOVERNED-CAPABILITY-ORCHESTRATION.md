# ADR-024 — Governed Capability Orchestration

## Status
Accepted — v2026.07.24.326

## Context
The strategic capability kernel introduced stable capability definitions and contracts, but did not yet provide a governed way to execute capabilities. Direct calls between experiences and services would recreate coupling, bypass lifecycle governance and make evidence inconsistent.

## Decision
Introduce one capability orchestration runtime between strategic capability contracts and registered service adapters.

The runtime must:
- resolve capabilities, contracts, dependencies, reviews and candidate services through the Capability Kernel;
- execute only explicitly registered adapters;
- fail closed when no adapter is available;
- use explicit, irreversible lifecycle transitions;
- require idempotency keys for mutating adapters;
- require evidence before successful completion;
- preserve correlation and causation identifiers;
- publish registered capability execution events and audit records;
- return manual review as an explicit state rather than silently continuing.

## Consequences
Existing services remain reusable. They can be migrated incrementally by registering adapters without changing strategic contracts or experiences. Experiences gain one stable execution boundary. Direct service calls remain temporarily possible for backward compatibility, but new cross-capability behaviour must use the orchestrator.
