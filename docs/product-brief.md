# WizerView Product Brief

## Vision

WizerView is a focused creative review platform for freelancers, studios, and clients. It keeps context, versions, discussion, and a clear outcome together around the work being reviewed.

## Positioning

Review smarter. Approve faster.

Creators organize client work in projects, send focused reviews, and receive contextual feedback without requiring client accounts.

## Product Hierarchy

```text
Project
  -> Review
    -> Deliverable
      -> Version
        -> Discussion
      -> Deliverable Decision + Decision Note
```

A Review Brief provides optional review-level context. A Deliverable Brief and Version Description add context at the point where it is useful.

## Core Principle

Deliverables are the source of truth. Discussion and decisions belong to a specific deliverable, and decisions may point to a specific version. WizerView is not a chat tool or a general project-management board.

## Target Users

- Freelance designers and developers
- Brand and web designers
- Small studios and creative agencies
- Marketing and product teams with lightweight review needs

## Product Promise

A client can open a link without registration, understand what is being reviewed, compare named versions, leave pinned discussion, and record a clear decision with an optional note.

## MVP Scope

- Creator accounts and client share links
- Projects with client-facing project links
- Reviews with an optional Review Brief and a defined goal
- Deliverables with an optional Deliverable Brief
- Named, editable versions for images, screenshots, and PDFs
- Pinned discussion and replies tied to a deliverable/version
- Deliverable-scoped decisions: approve, request changes, select a version, or mark reviewed
- Review status derived from the latest decision for each deliverable
- Share controls for comments, decisions, reviewer name, and project visibility

## Not In Scope

- Client accounts, roles, and team workflows
- Video review and live website embedding
- Figma integration
- Email notifications, billing, and AI summaries
- Kanban/task management
- Automatic URL screenshots or server-side PDF rendering

## Creative Direction

The primary comparison unit is a Version, while the durable top-level creative object is a Deliverable. This supports work such as Homepage -> Original / Dark Theme / Cleaner Hero, or Logo -> Monochrome / Gradient / Symbol Only.
