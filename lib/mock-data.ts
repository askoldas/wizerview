import type { AssetProcessingStatus } from '@/lib/asset-processing';

export type ReviewAssetType = 'image' | 'screenshot' | 'pdf' | 'website' | 'text' | 'unknown';
export type ReviewItemStatus = 'draft' | 'in_review' | 'changes_requested' | 'approved' | 'archived';

export interface AssetVersion {
  id: string;
  assetId: string;
  reviewId?: string;
  label: string;
  versionNumber: number;
  sortOrder: number;
  sourceUrl?: string;
  originalName?: string;
  originalMimeType?: string;
  originalBytes?: number;
  previewUrl?: string;
  thumbnailUrl?: string;
  previewMimeType?: 'image/webp' | 'image/jpeg' | 'image/png';
  previewBytes?: number;
  storagePath?: string;
  thumbnailStoragePath?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  pageNumber?: number;
  pageCount?: number;
  status?: AssetProcessingStatus;
  storageHint?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ReviewAsset {
  id: string;
  reviewId?: string;
  title: string;
  description: string;
  instructions?: string;
  assetType: ReviewAssetType;
  sortOrder: number;
  status?: ReviewItemStatus;
  accent: string;
  notes: string;
  versions: AssetVersion[];
  metadata?: Record<string, unknown>;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface Comment {
  id: string;
  reviewId?: string;
  assetId: string;
  assetVersionId?: string | null;
  optionId?: string | null;
  parentCommentId?: string | null;
  x?: number;
  y?: number;
  pageNumber?: number | null;
  text: string;
  author: string;
  authorRole?: 'creator' | 'reviewer';
  status?: 'open' | 'resolved';
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  replies?: Comment[];
}

export interface ShareSettings {
  reviewerNameRequired: boolean;
  pinProtection: boolean;
  allowComments: boolean;
  allowDecisions: boolean;
}

export interface ReviewData {
  id: string;
  shareToken?: string;
  title: string;
  client: string;
  instructions: string;
  shareSettings: ShareSettings;
  assets: ReviewAsset[];
  overallFeedback: string;
  decision: string;
  selectedDirection: string | null;
  selectedAssetVersionId?: string | null;
  comments: Comment[];
}

// Legacy option compatibility: old saved review JSON used Review -> options -> assets.
export interface LegacyAsset {
  id: string;
  title: string;
  kind: 'image' | 'screenshot' | 'pdf';
  description: string;
  accent: string;
  notes: string;
  originalName?: string;
  originalMimeType?: string;
  originalBytes?: number;
  previewUrl?: string;
  thumbnailUrl?: string;
  previewMimeType?: 'image/webp' | 'image/jpeg' | 'image/png';
  previewBytes?: number;
  storagePath?: string;
  thumbnailStoragePath?: string;
  width?: number;
  height?: number;
  pageNumber?: number;
  pageCount?: number;
  status?: AssetProcessingStatus;
  storageHint?: string;
}

export interface ReviewOption {
  id: string;
  title: string;
  description: string;
  assets: LegacyAsset[];
  feedback?: string;
}

type LegacySection = {
  options?: ReviewOption[];
};

type LegacyReviewData = Omit<Partial<ReviewData>, 'assets'> & {
  assets?: ReviewAsset[];
  options?: ReviewOption[];
  sections?: LegacySection[];
};

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function versionLabel(index: number) {
  return `Version ${alphabet[index] ?? index + 1}`;
}

function legacyAssetType(kind?: string): ReviewAssetType {
  if (kind === 'image' || kind === 'screenshot' || kind === 'pdf') return kind;
  return 'unknown';
}

function normalizeTitleKey(title: string) {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

function legacyOptionsFromReview(review: LegacyReviewData): ReviewOption[] {
  if (Array.isArray(review.options)) return review.options;
  if (Array.isArray(review.sections)) {
    return review.sections.flatMap((section) => section.options ?? []);
  }
  return [];
}

export function normalizeLegacyOptionsToAssets(review: LegacyReviewData): ReviewAsset[] {
  const groupedAssets = new Map<string, ReviewAsset>();

  legacyOptionsFromReview(review).forEach((option, optionIndex) => {
    option.assets.forEach((legacyAsset, assetIndex) => {
      const assetType = legacyAssetType(legacyAsset.kind);
      const groupKey = `${legacyAsset.id}:${normalizeTitleKey(legacyAsset.title)}:${assetType}:${assetIndex}`;
      const assetId = groupedAssets.get(groupKey)?.id ?? legacyAsset.id;
      const versionId = `${assetId}-version-${option.id}`;

      if (!groupedAssets.has(groupKey)) {
        groupedAssets.set(groupKey, {
          id: assetId,
          reviewId: review.id,
          title: legacyAsset.title,
          description: legacyAsset.description,
          assetType,
          sortOrder: assetIndex,
          status: 'in_review',
          accent: legacyAsset.accent,
          notes: legacyAsset.notes,
          versions: [],
        });
      }

      groupedAssets.get(groupKey)?.versions.push({
        id: versionId,
        assetId,
        reviewId: review.id,
        label: option.title || versionLabel(optionIndex),
        versionNumber: optionIndex + 1,
        sortOrder: optionIndex,
        originalName: legacyAsset.originalName,
        originalMimeType: legacyAsset.originalMimeType,
        originalBytes: legacyAsset.originalBytes,
        previewUrl: legacyAsset.previewUrl,
        thumbnailUrl: legacyAsset.thumbnailUrl,
        previewMimeType: legacyAsset.previewMimeType,
        previewBytes: legacyAsset.previewBytes,
        storagePath: legacyAsset.storagePath,
        thumbnailStoragePath: legacyAsset.thumbnailStoragePath,
        mimeType: legacyAsset.originalMimeType ?? legacyAsset.previewMimeType,
        width: legacyAsset.width,
        height: legacyAsset.height,
        pageNumber: legacyAsset.pageNumber,
        pageCount: legacyAsset.pageCount,
        status: legacyAsset.status ?? 'idle',
        storageHint: legacyAsset.storageHint,
      });
    });
  });

  return Array.from(groupedAssets.values()).map((asset, sortOrder) => ({
    ...asset,
    sortOrder,
    versions: asset.versions.sort((a, b) => a.sortOrder - b.sortOrder),
  }));
}

function normalizeAssets(review: LegacyReviewData): ReviewAsset[] {
  const sourceAssets = Array.isArray(review.assets) ? review.assets : normalizeLegacyOptionsToAssets(review);

  return sourceAssets.map((asset, assetIndex) => ({
    ...asset,
    reviewId: review.id,
    description: asset.description ?? '',
    assetType: asset.assetType ?? 'unknown',
    sortOrder: asset.sortOrder ?? assetIndex,
    status: asset.status ?? 'in_review',
    accent: asset.accent ?? 'from-stone-700 via-stone-500 to-stone-200',
    notes: asset.notes ?? 'Ready for review.',
    versions: (asset.versions ?? []).map((version, versionIndex) => ({
      ...version,
      assetId: asset.id,
      reviewId: review.id,
      label: version.label ?? versionLabel(versionIndex),
      versionNumber: version.versionNumber ?? versionIndex + 1,
      sortOrder: version.sortOrder ?? versionIndex,
      status: version.status ?? 'idle',
      mimeType: version.mimeType ?? version.originalMimeType ?? version.previewMimeType,
    })),
  }));
}

export function normalizeReviewData(review: ReviewData | LegacyReviewData): ReviewData {
  const normalized = review as LegacyReviewData;
  const assets = normalizeAssets(normalized);

  return {
    id: normalized.id ?? '1',
    shareToken: normalized.shareToken,
    title: normalized.title ?? 'Untitled review',
    client: normalized.client ?? '',
    instructions: normalized.instructions ?? '',
    shareSettings: normalized.shareSettings ?? {
      reviewerNameRequired: true,
      pinProtection: false,
      allowComments: true,
      allowDecisions: true,
    },
    assets,
    comments: (normalized.comments ?? []).map((comment) => ({
      ...comment,
      authorRole: comment.authorRole ?? 'reviewer',
      status: comment.status ?? 'open',
      parentCommentId: comment.parentCommentId ?? null,
      assetVersionId: comment.assetVersionId ?? comment.optionId ?? assets.find((asset) => asset.id === comment.assetId)?.versions[0]?.id ?? null,
      replies: (comment.replies ?? []).map((reply) => ({
        ...reply,
        assetVersionId: reply.assetVersionId ?? reply.optionId ?? comment.assetVersionId ?? null,
        parentCommentId: reply.parentCommentId ?? comment.id,
        authorRole: reply.authorRole ?? 'reviewer',
        status: reply.status ?? 'open',
        replies: [],
      })),
    })),
    overallFeedback: normalized.overallFeedback ?? '',
    decision: normalized.decision ?? '',
    selectedDirection: normalized.selectedDirection ?? null,
    selectedAssetVersionId: normalized.selectedAssetVersionId ?? normalized.selectedDirection ?? null,
  };
}

export const initialReview: ReviewData = normalizeReviewData({
  id: '1',
  title: 'Homepage Direction',
  client: 'Acme Studio',
  instructions: 'Please compare the homepage versions, leave notes, and select the strongest direction.',
  shareSettings: {
    reviewerNameRequired: true,
    pinProtection: false,
    allowComments: true,
    allowDecisions: true,
  },
  assets: [
    {
      id: 'homepage-desktop',
      title: 'Homepage desktop',
      assetType: 'screenshot',
      description: 'A polished desktop homepage direction.',
      sortOrder: 0,
      status: 'in_review',
      accent: 'from-stone-800 via-stone-600 to-stone-300',
      notes: 'The hierarchy feels calm and premium.',
      versions: [
        {
          id: 'homepage-desktop-version-a',
          assetId: 'homepage-desktop',
          label: 'Version A',
          versionNumber: 1,
          sortOrder: 0,
          status: 'ready',
        },
        {
          id: 'homepage-desktop-version-b',
          assetId: 'homepage-desktop',
          label: 'Version B',
          versionNumber: 2,
          sortOrder: 1,
          status: 'ready',
        },
      ],
    },
    {
      id: 'brand-page-preview',
      title: 'Brand page preview',
      assetType: 'pdf',
      description: 'A faux PDF page set for the supporting brand story.',
      sortOrder: 1,
      status: 'in_review',
      accent: 'from-slate-700 via-slate-500 to-slate-200',
      notes: 'The page flow is easy to skim.',
      versions: [
        {
          id: 'brand-page-preview-version-a',
          assetId: 'brand-page-preview',
          label: 'Version A',
          versionNumber: 1,
          sortOrder: 0,
          pageNumber: 1,
          pageCount: 2,
          status: 'ready',
        },
      ],
    },
  ],
  overallFeedback: '',
  decision: '',
  selectedDirection: null,
  selectedAssetVersionId: null,
  comments: [
    {
      id: 'comment-1',
      assetId: 'homepage-desktop',
      assetVersionId: 'homepage-desktop-version-a',
      x: 28,
      y: 36,
      text: 'The hero area feels confident without being loud.',
      author: 'Mina',
      authorRole: 'reviewer',
      status: 'open',
      createdAt: new Date().toISOString(),
      replies: [
        {
          id: 'comment-1-reply-1',
          assetId: 'homepage-desktop',
          assetVersionId: 'homepage-desktop-version-a',
          parentCommentId: 'comment-1',
          text: 'Agreed. I can keep this direction and tighten the CTA spacing.',
          author: 'Creator',
          authorRole: 'creator',
          status: 'open',
          createdAt: new Date().toISOString(),
        },
      ],
    },
    {
      id: 'comment-2',
      assetId: 'brand-page-preview',
      assetVersionId: 'brand-page-preview-version-a',
      x: 42,
      y: 54,
      text: 'The supporting page feels a little too dense.',
      author: 'Jules',
      authorRole: 'reviewer',
      status: 'open',
      createdAt: new Date().toISOString(),
      replies: [],
    },
  ],
});
