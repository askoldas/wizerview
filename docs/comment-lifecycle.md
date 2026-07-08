# Comment Lifecycle

WizerView comments are centered on the asset being reviewed.

Top-level comments are pinned notes. They belong to a review, version, asset, and optional page position. Replies belong to a top-level comment through `parent_comment_id` and render inside that comment thread.

Each comment tracks:

- author name and role: creator or reviewer
- body text
- open or resolved status
- created and updated timestamps
- resolver metadata for resolved threads

Reviewers with an active shared link can add pinned comments and replies when comments are enabled. They cannot resolve, reopen, update, or delete comments.

Creators can reply to threads and move top-level pinned comments between Open and Resolved. Resolve/reopen is creator-only in the app and protected by owner-scoped comment update policies.

Dashboard activity uses comment lifecycle state:

- open comment count
- resolved comment count
- new comment/reply activity since the creator last opened the review
- latest activity label and time

Future states that may be added later include internal notes, priority, labels, rejected comments, and assignees.
