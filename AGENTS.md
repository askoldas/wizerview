# AGENTS.md

## Project

This repository contains WizerView, a lightweight client review and approval tool for freelancers and small creative teams.

## Product Rule

Everything is centered around the asset, not the conversation.

Do not drift into generic project management, kanban boards, or enterprise proofing complexity unless explicitly requested.

## MVP Scope

Build around shareable reviews:

```text
Project -> Review -> Option -> Asset -> Pin Comment -> Decision
```

Projects are lightweight folders. Reviews are the main shared objects.

## Review Model

A review always starts with one option and one large asset canvas.

If no comparison is needed, the review has one option with one or more related assets.

If comparison is needed, the creator adds another option. Option B or Option C makes the review a comparison.

Each option can contain multiple related assets.

## MVP Asset Types

Use visual review surfaces only:

- images
- screenshots
- PDFs displayed as visual page surfaces

Do not add text draft assets in v1 unless the user explicitly changes scope.

Do not add live website embedding in v1.

Do not add automatic URL-to-screenshot generation in v1.

## Feedback Model

Use:

- simple pinned comments on visual assets
- option-level feedback
- overall review feedback
- final decision

Pinned comments should use percentage coordinates, not fixed pixels.

MVP pin tools are point pins only. Do not add drawing tools, rectangles, arrows, blur tools, or complex annotation UI unless requested.

## Reviewer Access

Reviewers do not need accounts.

Reviewer name is required before first feedback or decision.

Optional PIN protection may be represented in UI and implemented later.

## Decisions

Supported MVP decisions:

- approved
- changes requested
- direction selected
- suggest combining options

## Stack Preference

Preferred stack:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui style components
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Vercel

Build the first prototype with mock data and local state before wiring Supabase.

## Design Direction

WizerView should feel:

- clean
- fast
- premium but practical
- freelancer-friendly
- client-obvious

Avoid:

- heavy enterprise dashboards
- generic purple SaaS gradients
- excessive nested cards
- complex sidebars before the workflow needs them
- section-first or form-first review setup
- marketing page as the first product screen when building the app prototype

## Documentation

Read these docs before implementation:

- `docs/product-brief.md`
- `docs/ux-flow.md`
- `docs/technical-stack.md`
- `docs/pricing-strategy.md`
- `docs/asset-processing.md`
