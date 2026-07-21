# Locked product logic

WizerView is asset-centred: Project → Requests and Reviews → Deliverables → Versions. UI says Deliverable; stable database names may remain Asset/AssetVersion.

Reviews have independent lifecycle (`draft`, `open`, `closed`, `archived`), sharing, and derived outcome. Versions have `draft`, `published`, `withdrawn`; Decisions are append-only and deliverable-scoped. Requests are separate from Reviews and use `new`, `discussing`, `in_progress`, `ready_for_review`, `closed`, `declined`.

Creator and client are the only MVP roles. Reviewer names are attribution, not identity. Downloads, client accounts, task management, assignments, estimates, and message attachments are out of scope.
# Authenticated client access

Projects are ongoing authenticated client workspaces. A client reaches a Project through an active `project_client_memberships` row created by an email invitation; a Project bearer link is legacy read-only compatibility only.

Standalone Reviews remain independent and frictionless. Review access resolves server-side as one of: `creator`, `authenticated_project_client`, `authenticated_standalone`, `guest`, or `denied`. Project membership redirects a client into the Project Review context; an authenticated non-member remains standalone and receives no Project access.

Authenticated contributions retain both the auth user reference and a display-name snapshot. Guest contributions retain their original entered name and are never treated as authenticated Project members.
