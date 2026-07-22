# AI Editor 2.0

## New workflow

1. Michael writes new information naturally.
2. The server searches all active Knowledge Objects.
3. A deterministic lexical/semantic pre-ranker selects the strongest candidates.
4. OpenAI evaluates those candidates and recommends update, create or review.
5. The editor shows:
   - match score
   - reason
   - before
   - after
   - changed facts
6. Michael approves or edits.
7. The object is marked `needs_test`.
8. Only tests linked to that object are run.

## Creation rule

A new Knowledge Object is proposed only when no existing candidate is a reasonable editorial home.

## Safety

- Links are references only in this release.
- No arbitrary external page is crawled by the Cloudflare Worker.
- AI suggestions never publish directly.
- All changes are stored locally and exported for GitHub.
