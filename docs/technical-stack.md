# WizerView Technical Stack

## Stack

- Next.js App Router and TypeScript
- Tailwind CSS
- Supabase Auth, Postgres, Storage, and Row Level Security
- Vercel for the web application

Later additions may include a PDF-rendering worker, URL snapshot worker, Stripe, and Resend.

## Data Model

The database keeps its implementation-oriented names while the UI uses Deliverable terminology:

```text
profiles -> projects -> reviews -> assets -> asset_versions -> comments -> decisions
```

- `projects` group optional client engagements and have a share token.
- `reviews` may belong to a project and contain `review_goal` and `client_visible` controls.
- `assets` remain the internal persistence model for Deliverables.
- `asset_versions` remain the internal model for Versions; `label` is the display name.
- `comments` are deliverable/version-scoped discussion threads.
- `decisions.asset_id` makes outcomes explicitly deliverable-scoped, with an optional version reference.

## Public Sharing

- A review share token provides an unauthenticated client review surface.
- A project share token lists only non-draft, non-archived reviews explicitly marked client-visible.
- Security-definer RPCs validate tokens and ownership of deliverables/versions before inserting public comments or decisions.
- `get_shared_review_decision_context` supplies the review goal and latest decision per deliverable without altering the established shared-review payload.

## Status Derivation

`sync_review_status_from_decision` derives review status after a decision is inserted. The latest decision for each deliverable is authoritative; historical decision rows remain intact.

## Development Rules

- Keep `Asset`, `AssetVersion`, table names, API fields, and filenames internal.
- Use Deliverable and Version in visible UI copy.
- Preserve version order and identifiers when display names change.
- Apply migrations incrementally to existing Supabase environments. `schema.sql` is the canonical fresh-install source and should not be rerun against a populated environment.
