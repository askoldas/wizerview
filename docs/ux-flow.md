# WizerView UX Flow And Product Structure

## Core Object Model

WizerView is built around shareable reviews.

```text
Creator
  -> Project
    -> Review
      -> Section
        -> Option
          -> Asset
            -> Pin Comment
      -> General Feedback
      -> Decision
```

## Object Definitions

### Project

A lightweight folder for organizing work by client or engagement.

Projects should not be the main client-facing object in v1.

### Review

The main shareable object.

A review is what the creator sends to the client.

Examples:

- Homepage direction
- Logo concepts
- Brochure proof
- Social campaign review
- Final website screenshots

### Section

A review can contain one or more sections.

Section types:

1. `Review Together`
2. `Compare Options`

### Review Together Section

Use when multiple assets belong to one direction or deliverable.

Example:

- logo horizontal
- logo vertical
- square icon
- favicon

The reviewer does not choose between these assets. They review them as one set.

### Compare Options Section

Use when the client should compare directions and choose a preference.

Example:

- Option A: minimal homepage
- Option B: premium editorial homepage
- Option C: bold sales homepage

Each option can contain one or more assets.

Example:

- Option A
  - desktop screenshot
  - mobile screenshot
- Option B
  - desktop screenshot
  - mobile screenshot

### Asset

A visual item being reviewed.

MVP asset types:

- image
- screenshot
- PDF page set

### Pin Comment

A specific comment attached to a visual position on an asset.

Store coordinates as percentages so pins stay aligned when assets resize.

For images:

- asset id
- x percent
- y percent

For PDFs:

- asset id
- page number
- x percent
- y percent

### General Feedback

General feedback can exist at several levels:

- option-level feedback
- section-level feedback
- review-level overall feedback

### Decision

The final reviewer action.

Possible decisions:

- Approved
- Changes requested
- Direction selected
- Suggest combining options

## Creator Flow

### 1. New Review

The creator starts with `New Review`, not `New Project`.

Fields:

- review title
- optional project/client folder
- short instructions

Examples:

- "Please choose preferred homepage direction."
- "Please review the logo package and leave notes."
- "Please check this brochure before print."

### 2. Add Sections

The creator adds one or more sections.

Section choices:

- Review Together
- Compare Options

### 3. Add Assets

For `Review Together`:

- upload one or more assets into the section
- assets display in a natural stacked flow

For `Compare Options`:

- create Option A/B/C
- upload one or more assets inside each option
- add optional option title/description

### 4. Share Settings

MVP settings:

- reviewer name required: always on
- PIN protection: optional later, likely paid
- allow comments: on
- allow decisions: on

### 5. Share Link

Creator copies a secure review link.

The client receives the review link, not the whole project.

## Reviewer Flow

### 1. Open Review Link

Reviewer can view the review without account registration.

If PIN protection is enabled, show PIN modal first.

### 2. Enter Name

Reviewer name is required before first comment, preference, or final decision.

Name is for attribution. It is not an account.

### 3. Review Assets

The page displays sections in order.

For `Review Together`:

- assets are stacked in a natural flow
- each visual asset supports pinned comments
- section feedback appears after the assets

For `Compare Options`:

- desktop can show simple image options side-by-side when practical
- large assets, PDFs, or multi-asset options should use tabs/cards
- mobile should always use tabs or segmented controls
- each option supports pinned comments and option-level feedback
- reviewer can mark preference or select direction

### 4. Add Pin Comments

Reviewer clicks on a visual asset to create a numbered pin.

Comment behavior:

- click asset
- create pin
- open comment input
- save comment
- show comment in list/drawer
- clicking comment highlights pin

MVP pin tools:

- point pins only
- no arrows
- no rectangles
- no drawing
- no blur tools

### 5. General Feedback

Reviewer can write:

- option feedback
- section feedback
- overall review feedback

This supports comments like:

- "I prefer Option B, but use the heading style from A."
- "The logo set is good, but the favicon feels too detailed."

### 6. Final Decision

End-of-review actions:

- Approve
- Request changes
- Select direction
- Suggest combining options

For compare sections, the reviewer should be able to select a preferred option without being forced to approve the entire review.

## Review States

Recommended MVP states:

- Draft
- In Review
- Changes Requested
- Direction Selected
- Approved
- Archived

## Comment Visibility

MVP rule:

- comments are visible to everyone with the review link
- creator can resolve/reopen comments
- internal/private comments are not part of v1

## Read-Only States

A review should become read-only when:

- it is archived
- it is finalized/approved
- plan limits require disabling new comments

Existing client links should not break.
