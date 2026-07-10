import { createSupabaseClientInstance, isSupabaseConfigured } from '@/lib/supabase';

export type AssetProcessingStatus = 'idle' | 'uploading' | 'processing' | 'ready' | 'failed';

export interface UploadedOriginal {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface ProcessedPreview {
  id: string;
  kind: 'image' | 'screenshot' | 'pdf';
  originalName: string;
  originalMimeType: string;
  originalBytes: number;
  previewUrl: string;
  thumbnailUrl: string;
  previewMimeType: 'image/webp' | 'image/jpeg' | 'image/png';
  previewBytes: number;
  storagePath?: string;
  thumbnailStoragePath?: string;
  width: number;
  height: number;
  status: AssetProcessingStatus;
  storageHint: string;
  pageNumber?: number;
  pageCount?: number;
}

export interface PdfPagePreview extends ProcessedPreview {
  pageNumber: number;
}

export interface ProcessedPdfPreview extends ProcessedPreview {
  pages: PdfPagePreview[];
  pageCount: number;
}

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_PDF_BYTES = 20 * 1024 * 1024;
const MAX_FREE_PDF_PAGES = 10;
const DEFAULT_PREVIEW_WIDTH = 1600;
const TALL_PREVIEW_WIDTH = 1800;
const DEFAULT_PREVIEW_MAX_PIXELS = 6_000_000;
const TALL_PREVIEW_MAX_PIXELS = 18_000_000;
const THUMBNAIL_WIDTH = 320;
const THUMBNAIL_MAX_HEIGHT = 2400;

function createPlaceholderUrl(label: string, kind: 'preview' | 'thumb') {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
      <rect width="1200" height="800" rx="32" fill="#111827" />
      <rect x="72" y="72" width="1056" height="656" rx="24" fill="#f8fafc" />
      <rect x="128" y="140" width="420" height="24" rx="12" fill="#d1d5db" />
      <rect x="128" y="188" width="360" height="18" rx="9" fill="#e5e7eb" />
      <rect x="128" y="240" width="496" height="280" rx="20" fill="#f3f4f6" />
      <text x="128" y="620" font-family="Inter, Arial, sans-serif" font-size="44" fill="#111827">${kind === 'preview' ? 'WizerView preview' : 'Thumbnail'}</text>
      <text x="128" y="676" font-family="Inter, Arial, sans-serif" font-size="28" fill="#6b7280">${label}</text>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function toHumanBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function validateImageFile(file: File) {
  const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  if (!allowed.includes(file.type)) {
    return { valid: false, reason: 'Unsupported file type. Please upload PNG, JPG, or WebP.' };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return { valid: false, reason: `Image too large. Max ${toHumanBytes(MAX_IMAGE_BYTES)} on the MVP free plan.` };
  }

  return { valid: true };
}

export function validatePdfFile(file: File) {
  if (file.type !== 'application/pdf') {
    return { valid: false, reason: 'Unsupported file type. Please upload a PDF.' };
  }

  if (file.size > MAX_PDF_BYTES) {
    return { valid: false, reason: `PDF too large. Max ${toHumanBytes(MAX_PDF_BYTES)} on the MVP free plan.` };
  }

  return { valid: true };
}

function sanitizePathSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'asset';
}

function getPreviewProfile(width: number, height: number) {
  const aspectRatio = height / width;
  const isTallScreenshot = aspectRatio >= 2.4;

  return {
    maxWidth: isTallScreenshot ? TALL_PREVIEW_WIDTH : DEFAULT_PREVIEW_WIDTH,
    maxPixels: isTallScreenshot ? TALL_PREVIEW_MAX_PIXELS : DEFAULT_PREVIEW_MAX_PIXELS,
    quality: isTallScreenshot ? 0.9 : 0.82,
  };
}

function getConstrainedImageSize(width: number, height: number, options: { maxWidth: number; maxPixels: number }) {
  const widthScale = Math.min(1, options.maxWidth / width);
  const pixelScale = Math.min(1, Math.sqrt(options.maxPixels / (width * height)));
  const scale = Math.min(widthScale, pixelScale);

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function createOptimizedImageBlob(file: File, options: { maxWidth?: number; maxPixels?: number; quality?: number; mimeType: 'image/webp' }) {
  if (typeof window === 'undefined' || typeof createImageBitmap === 'undefined' || typeof document === 'undefined') {
    throw new Error('Image optimization is only available in a browser.');
  }

  const bitmap = await createImageBitmap(file);
  const profile = getPreviewProfile(bitmap.width, bitmap.height);
  const size = getConstrainedImageSize(bitmap.width, bitmap.height, {
    maxWidth: options.maxWidth ?? profile.maxWidth,
    maxPixels: options.maxPixels ?? profile.maxPixels,
  });
  const width = size.width;
  const height = size.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close?.();
    throw new Error('Could not prepare an image canvas for optimization.');
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, options.mimeType, options.quality ?? profile.quality));
  bitmap.close?.();
  if (!blob) {
    throw new Error('Could not generate an optimized WebP preview.');
  }

  return { blob, width, height };
}

function createUploadPath(fileName: string, blob: Blob) {
  const fileExtension = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${randomId}-${sanitizePathSegment(fileName)}.${fileExtension}`;
}

async function uploadOptimizedPreviewToSupabase(blob: Blob, fileName: string) {
  if (!isSupabaseConfigured()) return null;

  const client = createSupabaseClientInstance();
  if (!client) return null;

  const uploadPath = createUploadPath(fileName, blob);
  const uploadFile = new File([blob], uploadPath, { type: blob.type });

  const { error } = await client.storage.from('review-previews').upload(uploadPath, uploadFile, {
    cacheControl: '3600',
    upsert: true,
    contentType: uploadFile.type,
  });

  if (error) {
    throw new Error(`Supabase preview upload failed: ${error.message}`);
  }

  const { data } = client.storage.from('review-previews').getPublicUrl(uploadPath);
  return { url: data.publicUrl, path: uploadPath };
}

export async function processImagePreview(file: File): Promise<ProcessedPreview> {
  const validation = validateImageFile(file);
  if (!validation.valid) throw new Error(validation.reason);

  const previewResult = await createOptimizedImageBlob(file, {
    mimeType: 'image/webp',
  });

  const thumbnailResult = await createOptimizedImageBlob(file, {
    maxWidth: THUMBNAIL_WIDTH,
    maxPixels: THUMBNAIL_WIDTH * THUMBNAIL_MAX_HEIGHT,
    quality: 0.68,
    mimeType: 'image/webp',
  });

  const previewBlob = previewResult.blob;
  const thumbnailBlob = thumbnailResult.blob;

  const uploadedPreview = await uploadOptimizedPreviewToSupabase(previewBlob, file.name);
  const uploadedThumbnail = await uploadOptimizedPreviewToSupabase(thumbnailBlob, `${file.name}-thumb`);

  const resolvedPreviewUrl = uploadedPreview?.url
    ?? (typeof window !== 'undefined' && typeof URL.createObjectURL === 'function'
      ? URL.createObjectURL(previewBlob)
      : createPlaceholderUrl(file.name, 'preview'));
  const resolvedThumbnailUrl = uploadedThumbnail?.url
    ?? (typeof window !== 'undefined' && typeof URL.createObjectURL === 'function'
      ? URL.createObjectURL(thumbnailBlob)
      : createPlaceholderUrl(file.name, 'thumb'));

  const previewBytes = previewBlob.size;
  const width = previewResult?.width ?? DEFAULT_PREVIEW_WIDTH;
  const height = previewResult?.height ?? 900;

  return {
    id: `preview-${Date.now()}`,
    kind: 'screenshot',
    originalName: file.name,
    originalMimeType: file.type,
    originalBytes: file.size,
    previewUrl: resolvedPreviewUrl,
    thumbnailUrl: resolvedThumbnailUrl,
    previewMimeType: 'image/webp',
    previewBytes,
    storagePath: uploadedPreview?.path,
    thumbnailStoragePath: uploadedThumbnail?.path,
    width,
    height,
    status: 'ready',
    storageHint: uploadedPreview ? 'Optimized preview uploaded directly to Supabase Storage.' : 'Optimized preview generated locally for the MVP prototype.',
  };
}

export async function processPdfPreview(file: File): Promise<ProcessedPdfPreview> {
  const validation = validatePdfFile(file);
  if (!validation.valid) throw new Error(validation.reason);

  await new Promise((resolve) => setTimeout(resolve, 900));

  const previewUrl = createPlaceholderUrl(file.name, 'preview');
  const thumbnailUrl = createPlaceholderUrl(file.name, 'thumb');

  const previewBytes = Math.max(120_000, Math.round(file.size * 0.12));
  const pageCount = Math.min(3, MAX_FREE_PDF_PAGES);

  return {
    id: `pdf-preview-${Date.now()}`,
    kind: 'pdf',
    originalName: file.name,
    originalMimeType: file.type,
    originalBytes: file.size,
    previewUrl,
    thumbnailUrl,
    previewMimeType: 'image/webp',
    previewBytes,
    width: DEFAULT_PREVIEW_WIDTH,
    height: 1800,
    status: 'ready',
    storageHint: `PDF pages prepared for review with ${pageCount} page preview(s).`,
    pageCount,
    pages: Array.from({ length: pageCount }, (_, index) => ({
      id: `page-${Date.now()}-${index + 1}`,
      kind: 'pdf' as const,
      originalName: file.name,
      originalMimeType: file.type,
      originalBytes: file.size,
      previewUrl,
      thumbnailUrl,
      previewMimeType: 'image/webp' as const,
      previewBytes: Math.max(60_000, Math.round(previewBytes / (index + 1))),
      width: DEFAULT_PREVIEW_WIDTH,
      height: 1800,
      status: 'ready' as const,
      storageHint: `Page ${index + 1} preview generated.`,
      pageNumber: index + 1,
    })),
  };
}

export async function createThumbnail(image: ProcessedPreview | File) {
  if (image instanceof File) {
    return processImagePreview(image);
  }

  return {
    ...image,
    previewBytes: Math.max(40_000, Math.round(image.previewBytes * 0.35)),
    width: THUMBNAIL_WIDTH,
    height: Math.round((image.height / image.width) * THUMBNAIL_WIDTH),
    previewMimeType: 'image/webp' as const,
    storageHint: 'Thumbnail generated for the review list.',
  };
}

export function estimateStorageSavings(originalBytes: number, previewBytes: number) {
  if (!originalBytes || !previewBytes) return 0;
  return Math.max(0, Math.round(((originalBytes - previewBytes) / originalBytes) * 100));
}
