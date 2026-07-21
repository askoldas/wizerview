# Share Links and Reviewer Permissions

WizerView uses an internal review ID for the authenticated creator workspace and a share token for public client access.

- Creator workspace: `/reviews/[reviewId]`
- Public review: `/review/[shareToken]`
- Public project: `/project/[shareToken]`

The project share page lists only reviews the creator explicitly marks client-visible. Public reviewers do not need an account.

## Public Reviewer Permissions

With a valid active review link, reviewers can:

- Read the Review Brief, Deliverable Briefs, and Version Descriptions
- Add pinned discussion when comments are enabled
- Reply in existing discussion threads
- Record a deliverable-scoped decision and optional note when decisions are enabled

Reviewers cannot change creator-owned structure:

- Project or review title, client, brief, status, or sharing controls
- Deliverable or version labels, descriptions, order, uploads, or previews
- Review goal or client-visible state

Public comment and decision RPCs validate the share token and ensure the referenced deliverable and version belong to the review. `sync_review_status_from_decision()` derives the parent review status after a decision is inserted, without granting public update access to reviews.

PIN protection remains a UI placeholder and is not secure access control until it has a server-side verification flow.
