# WizerView UX Flow And Product Structure

## Core Object Model

```text
Creator
  -> Project (optional)
    -> Review
      -> Deliverable
        -> Version
          -> Pinned discussion
        -> Deliverable decision + decision note
```

## Project

A Project groups reviews for one client or engagement. It has an optional client-facing link that lists only reviews the creator explicitly marks client-visible. Reviews may also stand alone.

## Review

A Review is a focused request for feedback. It can include an optional Review Brief and one goal:

- Approve final work
- Choose a preferred version
- Feedback only

The goal controls which completion action the reviewer sees and how the review status is derived.

## Deliverable

A Deliverable is the creative item being reviewed, for example a homepage, logo, social campaign, or brand guide. It may have an optional Deliverable Brief. A review can contain one or more deliverables.

## Version

Each Deliverable has ordered versions. A creator adds a version through a lightweight naming dialog. The generated fallback remains Version A, Version B, and so on, but the creator can provide a descriptive name and rename it later. Long tab names truncate without changing the stored display name.

## Discussion

Reviewers click a visual preview to add pinned comments. Replies, resolution, and reopening stay tied to the relevant deliverable and version. Discussion is the feedback mechanism; there is no separate overall-feedback or review-summary product surface.

## Deliverable Decision

The reviewer records one outcome for the active deliverable, with an optional Decision Note:

- Approve / Request changes for final approval reviews
- Confirm selection / Request changes for version-selection reviews
- Done reviewing for feedback-only reviews

The creator sees the current outcome and note on each deliverable. The latest outcome per deliverable drives review status:

- Any latest changes request -> Changes requested
- Every deliverable approved -> Approved
- Every deliverable selected or reviewed under the matching goal -> Completed
- Otherwise -> In review

## Creator Flow

1. Create a project if the work needs client-level grouping, otherwise create a standalone review.
2. Name the review and choose its goal.
3. Add deliverables, their briefs, and named versions.
4. Set sharing controls and mark a review client-visible when it should appear in a shared project.
5. Share the review or project link.

## Reviewer Flow

1. Open a review or project link without registration.
2. Read the Review Brief and Deliverable Brief where provided.
3. Inspect named versions and add pinned discussion.
4. Record the appropriate deliverable decision and optional note.
