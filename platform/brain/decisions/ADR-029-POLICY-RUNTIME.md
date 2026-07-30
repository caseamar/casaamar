# ADR-029 — Governed Policy Runtime

## Status
Accepted

## Context
Governance rules existed as descriptive records and some behaviour remained embedded in service code. A scalable AI-first platform requires stable, machine-readable constraints that can be evaluated consistently across capabilities, services, agents and experiences.

## Decision
Introduce one deterministic Policy Runtime over the authoritative policy registry. Policies use a bounded declarative condition language, stable effects, explicit priorities, evidence requirements and obligations. Dynamic code execution is forbidden. Invalid policy registries, unsupported operators and integrity failures fail closed.

## Consequences
- AI and human workflows receive the same explainable policy verdict.
- Governance may evolve through versioned configuration rather than service rewrites.
- Deny and manual-review outcomes cannot be hidden by lower-precedence allow rules.
- Existing services may migrate incrementally; no parallel policy source is introduced.
