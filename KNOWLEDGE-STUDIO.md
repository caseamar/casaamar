# Knowledge Studio v1

## What it does
- Browse and select Knowledge Objects
- Edit existing objects locally
- Mark edited objects as `needs_test`
- Ask OpenAI for structured improvement suggestions
- Insert text or a link as input
- Select only relevant object tests
- Export updated `knowledge-cards.json`
- Export a reviewable `knowledge-changes.json`

## Important limitation
The static website cannot write directly to GitHub. Approved edits are therefore stored in the browser and exported as files for upload. This prevents accidental changes and keeps Michael in control.

## Link workflow
A link can be inserted as a reference. The first version does not automatically crawl arbitrary websites. AI classifies the link and proposes what should be reviewed or updated. Later, approved official source connectors can be added safely.

## Editorial rule
AI proposes. Michael edits and approves. Changed objects are automatically marked as not tested.
