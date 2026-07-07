# WizerView Technical Stack

## Recommended Stack

Use:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Vercel

Later:

- Stripe
- Resend
- background worker for PDF rendering
- Playwright worker for URL snapshots

## Why Supabase

WizerView has a naturally relational model:

```text
users -> projects -> reviews -> options -> assets -> comments -> decisions
```

Supabase Postgres fits this better than a document database.

Supabase also gives:

- authentication
- relational database
- file storage
- row level security
- realtime features later
- SQL-based reporting later

## Why Not Firebase For This Project

Firebase can work, but WizerView needs structured relationships, review states, plan limits, comments, decisions, and later reporting.

Firestore can model this, but it is less natural than Postgres for this product.

The user has also already experienced Firebase quota/build issues in other projects, so this project should avoid that path unless there is a strong reason.

## Deployment

Use Vercel for the Next.js app.

Do not run heavy browser/PDF processing in normal Vercel request handlers.

For later production features:

- PDF-to-image conversion can run in a worker service.
- URL-to-screenshot with Playwright can run in a separate worker service.
- Workers can be hosted on Railway, Render, Fly.io, or another low-cost worker host.

## Prototype Strategy

The first prototype should not require Supabase.

Build the first UI with local mock data so product flow can be evaluated quickly.

Then implement in this order:

1. Supabase schema
2. Supabase Auth
3. Supabase Storage uploads
4. reviews and share links
5. pinned comments
6. decisions
7. plan limits
8. PDF rendering worker
9. payments and email

## Suggested Data Model

### profiles

- id
- email
- display_name
- created_at

### projects

- id
- owner_id
- name
- client_name
- created_at
- updated_at

### reviews

- id
- project_id
- owner_id
- title
- instructions
- status
- share_token
- pin_enabled
- is_archived
- created_at
- updated_at

### review_options

- id
- review_id
- title
- description
- sort_order

Every review has at least one option. A review becomes a comparison when it has more than one option.

### assets

- id
- review_id
- option_id
- type
- title
- file_path
- mime_type
- width
- height
- page_count
- sort_order
- created_at

`type` values:

- image
- pdf
- pdf_page

### comments

- id
- review_id
- asset_id
- option_id
- parent_comment_id
- author_name
- author_role
- body
- x_percent
- y_percent
- page_number
- status
- created_at

`status` values:

- open
- resolved

### decisions

- id
- review_id
- option_id
- reviewer_name
- type
- note
- created_at

`type` values:

- approved
- changes_requested
- direction_selected
- combine_options

## Security Notes

- Creator accounts require Supabase Auth.
- Reviewer accounts are not required.
- Share links should use hard-to-guess tokens.
- Reviewer name is required before feedback or decisions.
- Optional PIN protection can be added later and likely belongs to paid plans.
- Existing shared links should remain viewable even if the creator hits plan limits.
