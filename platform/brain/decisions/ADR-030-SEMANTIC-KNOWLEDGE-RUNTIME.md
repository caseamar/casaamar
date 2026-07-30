# ADR-030 — Evidence-backed Semantic Knowledge Runtime

## Status
Accepted

## Context
AI-first experiences need shared knowledge with explicit provenance, confidence, temporal validity and conflict handling. Free text, embeddings and isolated graphs cannot be treated as authoritative truth.

## Decision
Introduce one governed Semantic Knowledge Runtime above authoritative sources. Knowledge is represented as evidence-backed claims. Every claim carries stable identity, confidence, validity and source lineage. Embeddings are replaceable retrieval adapters and never become a source of truth. Conflicting claims are preserved and material conflicts require human review.

The existing Casa Knowledge Graph remains the domain recommendation graph. The new runtime does not replace it; it provides a generic platform knowledge contract that future domains and AI agents can use.

## Consequences
- AI context can be assembled with traceable evidence.
- Unknown, low-confidence and contradictory knowledge remain explicit.
- Model providers and embedding stores remain replaceable.
- Experiences consume knowledge contracts rather than source-specific data.
- Material knowledge conflicts fail into governed review rather than silent resolution.
