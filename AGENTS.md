# AGENTS.md

## Project

This repository contains WizerView, a lightweight client review and approval tool for freelancers and small creative teams.

## Product Rule

Everything is centered around the asset, not the conversation.

Do not drift into generic project management, kanban boards, or enterprise proofing complexity unless explicitly requested.

## MVP Scope

Build around shareable reviews:

```text
Project -> Review -> Asset -> Version -> Pin Comment -> Decision
```

Projects are lightweight folders. Reviews are the main shared objects.

## Review Model

A review is asset-centered. The left rail lists assets, the center top lists versions for the selected asset, and the center canvas previews the selected version.

If no comparison is needed, an asset can have one version.

If comparison is needed, the creator adds Version B or Version C under that asset.

Each version belongs to one asset.

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
- version-specific pinned feedback
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
- suggest combining versions

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
- `docs/asset-version-model.md`
