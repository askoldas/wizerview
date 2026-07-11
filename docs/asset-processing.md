# Asset Processing and Preview Storage

## Storage Principle

WizerView is not file storage. WizerView stores lightweight review previews.

Original uploaded files are temporary processing inputs. They should be deleted after preview generation unless a future paid feature explicitly stores originals.


## Asset Ingestion Flow

### Images

- User uploads PNG, JPG, or WebP.
- Validate file type and size.
- Read image dimensions.
- Resize if the asset is too large for review.
- Convert to an optimized preview format.
- Generate a thumbnail.
- Store preview + thumbnail.
- Discard the original upload after processing.
- Store processing metadata in the review database.

### PDFs

- User uploads a PDF.
- Validate size and page count.
- Render pages into page previews.
- Limit pages according to plan.
- Resize and compress each preview.
- Generate thumbnails for each page.
- Discard the original PDF after processing.
- Store page-preview metadata.
- Attach comments to page number + x/y percent coordinates.

## Preview Format Decision

MVP previews should use WebP.

Why WebP:
- good compression
- wide browser support
- easier and faster than AVIF
- strong balance for screenshots and design assets

AVIF can be added later as an optional higher-compression format, but it should not block the first build.

Suggested defaults:
- preview format: WebP
- thumbnail format: WebP
- JPEG fallback only if needed
- PNG only for special transparent cases where WebP creates unacceptable results

## Image Size Policy

Suggested MVP defaults:
- max original upload image size: 10MB on free/MVP, configurable later
- max original PDF size: 20MB on free/MVP, configurable later
- max PDF pages processed on free: 10
- max preview width: 1600px
- max preview height: allow long page previews, but cap long screenshots to avoid large files
- thumbnail width: 320px
- WebP quality: 75-82 for previews
- thumbnail quality: 60-70

## Metadata To Store

For each processed asset preview, store:
- original filename
- original MIME type
- original byte size
- preview MIME type
- preview byte size
- width
- height
- storage path
- thumbnail path
- page number if PDF page
- processing status
- createdAt

## Retention Rules

- Original upload is temporary.
- Original is deleted after successful processing.
- Failed processing deletes temporary files.
- Free inactive reviews can become read-only or be deleted later.
- Archived paid reviews can keep previews based on plan limits.

## Error States

The product UI should surface these states:
- uploading
- processing
- processed
- failed
- file too large
- unsupported file type
- PDF too many pages
- PDF render failed

## Prototype Implementation Notes

The current prototype uses local/mock state for the first pass, but image uploads now compress in the browser and can push optimized WebP previews directly to Supabase Storage when configured.

- The builder now supports uploading image or PDF assets.
- Images are compressed client-side for the MVP and uploaded as optimized WebP previews.
- PDF handling remains mocked for the prototype and is intentionally deferred to a later worker-based pipeline for rendering, retries, and large-file processing.
- The app treats assets as processed review previews, not original files.
- The model stores preview URLs, dimensions, and size metadata without persisting the original upload.

## MVP Supabase Storage Flow

For images in the MVP:
- compress and resize the image in the browser
- generate an optimized WebP preview and WebP thumbnail
- upload only those optimized previews to the `review-previews` bucket
- store preview metadata and storage paths in the review data
- never upload the original image as a durable stored asset

Worker-based processing is deferred. Use it later for PDF rendering, large files, retries, and URL screenshots.
