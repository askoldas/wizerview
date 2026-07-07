# WizerView UX Flow And Product Structure

## Core Object Model

WizerView is built around shareable visual reviews.

```text
Creator
  -> Project
    -> Review
      -> Option
        -> Asset
          -> Pin Comment
      -> Overall Feedback
      -> Decision
```

The asset preview is the center of the product. Options, controls, comments, and decisions exist around the asset.

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

### Option

Every review has at least one option.

If there is no comparison, the review simply has one option with related assets.

If the creator adds Option B or Option C, the review becomes a comparison.

Examples:

- Logo review without comparison:
  - Main option
    - horizontal logo
    - square logo
    - favicon
- Homepage direction comparison:
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

Related assets belong inside the same option.

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

General feedback can exist at:

- option level
- review level

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

Default screen:

- review title
- optional project/client name
- short instructions
- one default option
- large empty asset canvas with upload CTA

The creator should see the asset canvas before any structural choices.

### 2. Add Assets

The creator uploads an image, screenshot, or PDF.

The asset appears large in the center of the builder.

The creator can add related assets inside the same option:

- desktop screenshot
- mobile screenshot
- logo
- PDF page set

### 3. Add Comparison Options

If the client should compare directions, the creator clicks `Add comparison option`.

Then Option B / Option C appear near the asset canvas.

Adding another option is what makes a review a comparison.

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

### 2. Review Assets

The page shows:

- compact review title and instructions
- option switcher close to the asset
- large asset preview
- related asset tabs or thumbnails close to the asset
- comment list for the current asset
- one clear decision area

### 3. Enter Name When Acting

Reviewer name is required only when the reviewer tries to:

- add a pin/comment
- write feedback
- prefer/select an option
- approve/request changes

Name is collected once and reused.

### 4. Add Pin Comments

Reviewer clicks on a visual asset to create a numbered pin.

Comment behavior:

- click asset
- create pin
- open comment input
- save comment
- show comment in list/panel
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
- overall review feedback

### 6. Final Decision

For a one-option review:

- Approve
- Request changes

For a comparison review:

- Prefer this option
- Select the active option as the direction
- Suggest combining options
- Request changes

If the reviewer selects a direction, the UI must clearly show which option was selected.

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
- creator can resolve/reopen comments later
- internal/private comments are not part of v1

## Read-Only States

A review should become read-only when:

- it is archived
- it is finalized/approved
- plan limits require disabling new comments

Existing client links should not break.
