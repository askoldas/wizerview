# WizerView

WizerView is a lightweight client review and approval tool for freelancers and small creative teams.

It helps creators send one visual review link where clients can compare asset versions, leave pinned feedback on the exact version, and approve or request changes without creating an account.

## Core Positioning

Send clients one visual review link. Compare versions, collect clear feedback, and get approval without client accounts.

## Product Principle

Everything is centered around the asset, not the conversation.

WizerView is not a generic project management tool. The work itself is the center of the review. Comments, replies, choices, and approvals stay attached to the asset, version, or review they refer to.

## MVP Direction

The first prototype should focus on:

- Creating a review before requiring project structure.
- Organizing reviews around assets and versions.
- Supporting asset-specific version comparison.
- Uploading visual assets: images, screenshots, and PDFs.
- Displaying PDFs as page-based review surfaces.
- Adding simple pinned comments to visual assets.
- Collecting version-specific pinned feedback and overall review feedback.
- Requiring reviewer name before comments or decisions.
- Supporting optional PIN protection later.
- Letting the reviewer approve, request changes, or select a direction.

Text assets, live website embedding, automatic URL screenshots, billing, teams, integrations, AI, and advanced version comparison are not part of the first prototype.

## Prototype Run Guide

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open http://localhost:3000

To connect the prototype to Supabase, copy [.env.local.example](.env.local.example) to .env.local and add your project URL and anon key. The app will use Supabase when those values are present, and fall back to the built-in mock data otherwise.

The prototype includes:
- a dashboard of recent reviews
- a review builder with share settings and section creation
- a client-facing review experience with pinned comments, feedback, and decision actions

## Documentation

- [Product Brief](docs/product-brief.md)
- [UX Flow and Product Structure](docs/ux-flow.md)
- [Technical Stack](docs/technical-stack.md)
- [Pricing Strategy](docs/pricing-strategy.md)
- [Asset Processing and Preview Storage](docs/asset-processing.md)
- [Asset Version Model](docs/asset-version-model.md)
- [Share Links and Reviewer Permissions](docs/share-links-and-permissions.md)
- [Comment Lifecycle](docs/comment-lifecycle.md)
- [Codex Prototype Prompt](docs/codex-prototype-prompt.md)
- [Agent Instructions](AGENTS.md)
