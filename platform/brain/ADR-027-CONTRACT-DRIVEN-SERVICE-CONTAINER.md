# ADR-027: Contract-driven Service Container

## Status
Accepted

## Decision
Platform consumers resolve implementations through stable service-binding contracts rather than importing concrete implementations directly. The container supports explicit singleton and transient scopes, dependency graphs, protected replacement, cycle detection and fail-closed validation.

## Rationale
This preserves capability and experience contracts while allowing replaceable AI providers, integrations and runtime implementations. It reduces coupling without forcing a rewrite of existing services.

## Consequences
Existing direct calls remain compatible during migration. New platform runtime integrations must register and resolve through the container. Replacement is permitted only when the binding explicitly declares itself replaceable.
