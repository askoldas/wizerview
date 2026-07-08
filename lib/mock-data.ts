import type { AssetProcessingStatus } from '@/lib/asset-processing';

export interface Asset {
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

export interface Comment {
  id: string;
  reviewId?: string;
  optionId?: string | null;
  assetId: string;
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

export interface ReviewOption {
  id: string;
  title: string;
  description: string;
  assets: Asset[];
  feedback?: string;
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
  options: ReviewOption[];
  overallFeedback: string;
  decision: string;
  selectedDirection: string | null;
  comments: Comment[];
}

export const initialReview: ReviewData = {
  id: '1',
  title: 'Homepage Direction',
  client: 'Acme Studio',
  instructions: 'Please compare the homepage directions, leave notes, and select the strongest direction.',
  shareSettings: {
    reviewerNameRequired: true,
    pinProtection: false,
    allowComments: true,
    allowDecisions: true,
  },
  options: [
    {
      id: 'option-a',
      title: 'Version A',
      description: 'A calm, premium homepage concept for the launch.',
      assets: [
        {
          id: 'desktop-home',
          title: 'Homepage desktop',
          kind: 'screenshot',
          description: 'A polished desktop hero with rich whitespace and a clear CTA.',
          accent: 'from-stone-800 via-stone-600 to-stone-300',
          notes: 'The hierarchy feels calm and premium.',
        },
        {
          id: 'mobile-home',
          title: 'Homepage mobile',
          kind: 'screenshot',
          description: 'A compact mobile experience with a stronger proof stack.',
          accent: 'from-stone-700 via-orange-200 to-stone-100',
          notes: 'Good rhythm and strong product storytelling.',
        },
        {
          id: 'logo-h',
          title: 'Logo horizontal',
          kind: 'image',
          description: 'A wide lockup for the header and hero area.',
          accent: 'from-slate-800 via-slate-600 to-slate-300',
          notes: 'The spacing feels balanced.',
        },
        {
          id: 'pdf-preview',
          title: 'Brand page preview',
          kind: 'pdf',
          description: 'A faux PDF page set for the supporting brand story.',
          accent: 'from-slate-700 via-slate-500 to-slate-200',
          notes: 'The page flow is easy to skim.',
        },
      ],
    },
  ],
  overallFeedback: '',
  decision: '',
  selectedDirection: null,
  comments: [
    {
      id: 'comment-1',
      assetId: 'desktop-home',
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
          assetId: 'desktop-home',
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
      assetId: 'pdf-preview',
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
};

type LegacySection = {
  options?: ReviewOption[];
};

type LegacyReviewData = Omit<ReviewData, 'options'> & {
  options?: ReviewOption[];
  sections?: LegacySection[];
};

export function getReviewOptions(review: ReviewData | LegacyReviewData): ReviewOption[] {
  if ('options' in review && Array.isArray(review.options)) {
    return review.options;
  }

  if ('sections' in review && Array.isArray(review.sections)) {
    return review.sections.flatMap((section) => section.options ?? []);
  }

  return [];
}

export function normalizeReviewData(review: ReviewData | LegacyReviewData): ReviewData {
  const normalized = review as LegacyReviewData;
  return {
    ...normalized,
    options: getReviewOptions(review),
    comments: (normalized.comments ?? []).map((comment) => ({
      ...comment,
      authorRole: comment.authorRole ?? 'reviewer',
      status: comment.status ?? 'open',
      parentCommentId: comment.parentCommentId ?? null,
      replies: comment.replies ?? [],
    })),
    overallFeedback: normalized.overallFeedback ?? '',
    decision: normalized.decision ?? '',
    selectedDirection: normalized.selectedDirection ?? null,
  };
}
