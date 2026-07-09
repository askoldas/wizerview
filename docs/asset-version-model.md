# Asset Version Model

WizerView is now modeled around reviewable assets and versions of those assets.

## Old Model

The prototype started with:

```text
Review -> Options -> Assets
```

That made early comparison flows quick to build, but it inverted the product mental model. The UI already works as an asset-centered review workspace: assets live in the left rail, versions sit above the preview, and feedback belongs to the exact thing being reviewed.

## New Model

The Phase 1 model is:

```text
Review -> Assets -> Versions
```

An asset is the conceptual item under review, such as a homepage, logo, PDF, screenshot, or future website capture. A version is a specific direction, revision, or uploaded preview for that asset.

## Comments

Pinned comments attach to both:

- `assetId`
- `assetVersionId`

They keep percentage coordinates and optional page metadata. Replies stay attached to the top-level comment through `parent_comment_id`, and resolve/reopen status remains on the thread root.

## Decisions

Review-level decisions still support approval and requested changes. Version-specific decisions, such as selecting a direction, should store `assetVersionId` so the selected version is unambiguous.

## Database Rollout

Phase 1 adds:

- `asset_versions`
- nullable `comments.asset_version_id`
- nullable `decisions.asset_version_id`
- asset metadata/status columns for conceptual assets

The old `review_options` table is not dropped in this phase. It remains as legacy compatibility while existing saved `reviews.content` JSON and historical rows are transformed into `assets[].versions[]` on load.

## Backfill Strategy

The migration creates one asset version for each legacy asset row. This preserves previews, storage metadata, dimensions, PDF page metadata, processing state, and old option labels without attempting risky grouping.

When a saved review still contains old `options`, the app normalizes it through `normalizeLegacyOptionsToAssets`. On the next save, `reviews.content` is written in the new asset/version shape.

## Future Support

This foundation supports version comparison per asset, richer asset metadata, and eventual cleanup of `review_options` once production data has been verified.
