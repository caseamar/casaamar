# ADR-026: Authoritative Platform Metadata Runtime

## Status
Accepted

## Context
Platform building blocks were already represented in separate registries, but consumers still needed to know each registry path and shape. That encourages hardcoded lists, fragmented discovery and AI behaviour tied to implementation details.

## Decision
Introduce one authoritative metadata manifest and a read-only metadata runtime. The manifest describes entity types, source registries, identifiers, semantic fields, relationship fields and intended AI usage. The runtime loads authoritative registries, validates identity and references, and provides deterministic discovery, search, relationship and impact operations.

The metadata runtime does not duplicate domain data and does not become a second source of truth. It indexes existing registries and fails closed on broken references.

## Consequences
- AI and experiences can discover platform structure through one stable contract.
- Existing registries remain authoritative and independently versioned.
- Hardcoded subsystem lists can be migrated incrementally.
- Metadata integrity becomes a release-blocking concern.
- Future dependency injection, policy and digital-twin runtimes can build on the same graph.
