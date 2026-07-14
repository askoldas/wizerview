# Locked product logic

WizerView is asset-centred: Project → Requests and Reviews → Deliverables → Versions. UI says Deliverable; stable database names may remain Asset/AssetVersion.

Reviews have independent lifecycle (`draft`, `open`, `closed`, `archived`), sharing, and derived outcome. Versions have `draft`, `published`, `withdrawn`; Decisions are append-only and deliverable-scoped. Requests are separate from Reviews and use `new`, `discussing`, `in_progress`, `ready_for_review`, `closed`, `declined`.

Creator and client are the only MVP roles. Reviewer names are attribution, not identity. Downloads, client accounts, task management, assignments, estimates, and message attachments are out of scope.
