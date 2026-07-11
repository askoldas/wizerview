# WizerView UX Architecture v1

This document captures the locked UX direction.

## Product Philosophy
WizerView is a guided creative review workflow.

## Review Hierarchy
- Review Objective
- Review Brief
- Assets
  - Asset Context
  - Versions
    - Version Description
    - Discussion
  - Asset Decision
- Review Completion

## Review Brief
- Large card above workspace.
- Auto-collapses into a floating chip after slight preview scroll.
- Expand again on click.

## Workspace
Header

Review Brief

Asset Rail | Preview Workspace | Review Drawer

No bottom toolbar.

## Drawer
One continuous scroll:
- Discussion
- Pinned comments
- Review Summary
- Final Decision
- Creator Settings (creator only)

Sidebar icons are navigation shortcuts that scroll to sections rather than switching modes.

## Layout
- Drawer docks and shrinks preview.
- Never overlays preview.
- Asset rail collapses to compact Assets button when drawer opens.

## Preview
- Single framed preview.
- No nested cards.
- Preview container owns scrolling.

## Version Toolbar
- Version tabs
- Select version
- Download
- Overflow
- Helper text: Click anywhere on the preview to add a pinned comment.

## Context Levels
- Review Brief
- Asset Context
- Version Description

## Review Flow
Review Brief → Assets → Discussion → Review Summary → Final Decision.

## Acceptance Criteria
- One drawer scrollbar.
- No bottom toolbar.
- Decision integrated into workflow.
- Existing comments, pins and permissions preserved.
