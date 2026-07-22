# Knowledge Card workflow

## What a Knowledge Card is

A Knowledge Card is the canonical unit of knowledge in Casa Amar. It may contain:

- title and category
- short answer and longer body
- visibility and trust
- source and review status
- channels: AI, website, guest guide and owner guide
- relations to other cards
- dynamic/expiry rules
- translation status
- test coverage

## How Michael works

Michael writes naturally in ChatGPT. Examples:

- “There is a new airfryer. It may be public.”
- “This is only an internal recommendation.”
- “This external website is useful, but do not show the link.”
- “This is just a draft note.”

ChatGPT then creates or updates Knowledge Cards and returns an upload package.

## Publication later

A card can be switched from internal to public by changing:

```json
"channels": {
  "ai": true,
  "website": true,
  "guest_guide": true,
  "owner_guide": true
}
```

The content therefore does not need to be recreated when it later becomes part of the website or guide.

## Knowledge gaps

Future unanswered questions will become draft cards or inbox items. They can later be researched, approved and activated.
