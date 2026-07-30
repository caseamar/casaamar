# ADR-028 — Immutable and Replayable Event Fabric

**Status:** Accepted  
**Release:** v2026.07.24.330

## Context
The event platform already provided registered events, correlation, idempotency and runtime subscriptions, but it did not provide ordered partitions, consumer checkpoints, replay ranges or observable failed delivery. Those omissions would force future AI agents and distributed services to invent incompatible delivery semantics.

## Decision
Upgrade the existing event platform in place to an Event Fabric. Preserve the public `CasaEvents` API while adding append-only partition streams, monotonic sequence numbers, integrity signatures, consumer registration, at-least-once delivery, success checkpoints, bounded retries, dead-letter evidence and deterministic replay. Keep transport and persistence behind adapter-ready contracts; the static reference implementation remains in-memory.

## Consequences
Existing publishers and subscribers remain compatible. New consumers can migrate incrementally. A durable remote adapter can later replace the in-memory store without changing event envelopes or consumer contracts. Failed consumers no longer silently lose events.
