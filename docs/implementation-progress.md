# Implementation progress

## Phase 0 — Audit and documentation

Status: complete

Implemented:
- Confirmed branch `UX_architecture` and recorded dirty local work.
- Audited repository instructions, README, docs inventory, current routes, and migration inventory.
- Added locked logic, roadmap, progress, and future-delivery documents.

Validated:
- Documentation-only phase; no functional code changed in this phase.

Remaining:
- Phase 2: structured schema and migration foundation.

Known risks:
- Existing local Project/Request/access-code changes are uncommitted and must be preserved while normalising legacy logic.

## Phase 1 — Canonical domain types and normalisation

Status: complete

Implemented:
- Added `lib/domain.ts` with canonical lifecycle, publication, goal, Decision, permission, activity and attention types.
- Added compatibility normalisers for legacy review and version status values.

Validated:
- Typecheck pending for this phase.

## Phase 2 — Schema and migration foundation

Status: complete

Implemented:
- Added lifecycle, publication, activity, read-cursor, review-round and PDF-page foundation migration.

Migration applied:
- `20260715_canonical_lifecycle_foundation.sql`.

Validated:
- Schema reviewed for additive compatibility; existing content blobs, share tokens, comments and Decisions are preserved.

Remaining:
- Phase 3: secure Project and Review sharing normalisation.

## Phase 3 — Secure Project and Review sharing

Status: complete

Implemented:
- Added a lifecycle and sharing gate around the legacy shared Review payload.

Migration applied:
- `20260715_secure_shared_review_gate.sql`.

Validated:
- Typecheck and lint pass.

Remaining:
- Phase 4: Project and Review lifecycle controls and read-only enforcement.

## Phase 4 — Project and Review lifecycle

Status: complete

Implemented:
- Added creator-only Project and Review lifecycle transition RPCs.

Migration applied:
- `20260715_lifecycle_transition_rpcs.sql`.

Remaining:
- Phase 5: Version publication and revision rounds.

## Phase 5 — Version publication and revision rounds

Status: complete

Implemented:
- Added creator-only Version publication and withdrawal RPC.

Migration applied:
- `20260715_version_publication_rpcs.sql`.

Validated:
- Typecheck and lint pass.

Remaining:
- Phase 6: Decisions and status derivation.

## Phase 6 — Decisions and status derivation

Status: complete

Implemented:
- Added append-only Decision invalidation and supersession foundation.

Migration applied:
- `20260715_decision_history_foundation.sql`.

Validated:
- Typecheck and lint pass.

Remaining:
- Phase 7: Comments, replies and moderation.

## Phase 7 — Comments, replies and moderation

Status: complete

Implemented:
- Added audit metadata for comment and Request-message edits and tombstone removals.

Migration applied:
- `20260715_comment_moderation_foundation.sql`.

Validated:
- Typecheck and lint pass.

Remaining:
- Phase 8: Requests and References.

## Phase 8 — Requests and References

Status: complete

Implemented:
- Enforced client edit/withdrawal only for untouched new Requests.
- Enforced same-Project Review linking and moves linked Requests to in progress.

Migration applied:
- `20260715_request_edge_case_rpcs.sql`.

Validated:
- Typecheck and lint pass.

Remaining:
- Phase 9: Activity, unread and attention.

## Phase 9 — Activity, unread and attention

Status: complete

Implemented:
- Added creator-scoped read cursors for Project and Review activity.
- Added RLS policies so activity and read state remain creator-owned.

Migration applied:
- `20260715_activity_read_rpcs.sql`.

Validated:
- Typecheck and lint pass.

Remaining:
- Phase 10: Active-work usage foundation.

## Phase 10 — Active-work usage foundation

Status: complete

Implemented:
- Added one canonical active-work calculation: active Projects plus open standalone Reviews.
- Added database enforcement for starting or reopening active work while preserving existing over-limit work and all client links.
- Added creator-dashboard usage and over-limit messaging; server errors remain visible in the create flows.

Migration applied:
- `20260715_active_work_usage_foundation.sql`.

Validated:
- Typecheck and lint pass.

Remaining:
- Phase 11: Browser PDF processing.

## Phase 11 — Browser PDF processing

Status: complete

Implemented:
- Replaced placeholder PDF output with browser-only `pdfjs-dist` worker rendering.
- Renders pages sequentially as WebP previews and thumbnails, with page progress, cancellation, retry-by-reupload, limits, cleanup and clear corrupt/password-protected errors.
- Persists ordered page metadata to `asset_version_pages`; the original PDF is never uploaded by this flow.

Migration applied:
- `20260715_pdf_page_row_access.sql`.

Validated:
- Typecheck and lint pass.

Remaining:
- Phase 12: Zoom and preview correctness.

## Phase 12 — Zoom and preview correctness

Status: complete

Implemented:
- Added Fit, 50%, 75%, 100%, 125% and 150% zoom controls to the review surface.
- Zoom changes the preview's real layout dimensions, so normalized pin coordinates and click locations remain aligned.
- PDF page switching now renders the selected page image and shows only that page's pinned comments.
- Existing pin reveal behavior continues to use the scroll container after drawer resizing.

Validated:
- Typecheck, lint and production build pass.

Remaining:
- Phase 13: Authentication, account and launch states.

## Phase 13 — Authentication, account and launch states

Status: complete

Implemented:
- Added password-reset email and recovery-password flows.
- Replaced the Settings placeholder with a minimal account and support/deletion path.
- Added a public unavailable-review state with a stable error reference.
- Replaced placeholder Terms and Privacy pages, added a support route, and added a first-use checklist.

Validated:
- Typecheck and lint pass. The production build exceeded this environment's route-generation timeout after compiling successfully; it needs one local or CI build rerun.

Remaining:
- Phase 14: Downloads removal and future-delivery documentation.

## Phase 14 — Downloads removal and future documentation

Status: intentionally deferred

The download icon remains as a visual placeholder by product direction. No download or delivery implementation was added in this phase.

## Phase 15 — Final trust audit

Status: blocked on release dependency decision

Implemented:
- Audited route and control states and recorded working, polish, future and manual-QA classifications.
- Recorded preview-storage and release verification boundaries.

Validated:
- Typecheck and lint pass.
- `npm audit --omit=dev` reports one critical and one moderate vulnerability; its available automatic fix is a breaking Next.js 16 upgrade and was not applied.

Blocking decision:
- Approve a planned Next.js upgrade/remediation path before production release.
