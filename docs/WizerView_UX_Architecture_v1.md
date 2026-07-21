# WizerView UX Architecture v1

This document captures the current guided creative-review direction.

## Review Hierarchy

- Review Goal
- Review Brief
- Deliverables
  - Deliverable Brief
  - Versions
    - Version Description
    - Discussion
  - Deliverable Decision + Decision Note
- Review Completion

## Workspace

```text
Header
Review Brief
Deliverable rail | Preview workspace | Review drawer
```

There is no bottom toolbar. The preview remains the primary visual surface.

## Review Drawer

The drawer is a continuous scroll for discussion. Its navigation controls scroll to discussion or the deliverable decision rather than switching product modes. Creator settings open in a lightweight dialog.

## Preview and Rail

- The drawer docks beside the preview at desktop sizes.
- The deliverable rail collapses while the drawer is open.
- Preview thumbnails retain their own fixed visual height; they do not stretch to fill the rail.
- The preview container owns scrolling.

## Version Toolbar

- Named, truncating version tabs
- Lightweight New Version / Rename Version dialog
- Version selection where relevant to the review goal
- Download and overflow controls
- Pinned-discussion helper text

## Review Flow

```text
Review Brief -> Deliverable Brief -> Version Description -> Discussion -> Deliverable Decision + Decision Note
```

## Acceptance Criteria

- One drawer scrollbar and no bottom toolbar
- Pinned discussion, comments, and permissions remain intact
- Decision is deliverable-scoped and follows the selected review goal
- Version display names do not alter version IDs, ordering, or relationships
