import { initialReview, normalizeReviewData, type Comment, type ReviewData } from '@/lib/mock-data';
import { createSupabaseClientInstance, isSupabaseConfigured } from '@/lib/supabase';

const REVIEW_TABLE = 'reviews';
const COMMENT_TABLE = 'comments';
const OPTION_TABLE = 'review_options';
const ASSET_TABLE = 'assets';

export interface ReviewSummary {
  id: string;
  title: string;
  client: string;
  status: string;
  updatedAt: string;
  comments: number;
}

export function createEmptyReviewData(reviewId: string): ReviewData {
  return {
    id: reviewId,
    title: 'Untitled review',
    client: '',
    instructions: '',
    shareSettings: {
      reviewerNameRequired: true,
      pinProtection: false,
      allowComments: true,
      allowDecisions: true,
    },
    options: [
      {
        id: `option-${reviewId}-a`,
        title: 'Option A',
        description: 'Primary direction for review.',
        assets: [],
      },
    ],
    overallFeedback: '',
    decision: '',
    selectedDirection: null,
    comments: [],
  };
}

function getReviewStatus(review: ReviewData) {
  if (review.decision === 'Approve') return 'approved';
  if (review.decision === 'Request changes') return 'changes_requested';
  if (review.selectedDirection) return 'direction_selected';
  return 'in_review';
}

function findOptionIdForAsset(review: ReviewData, assetId: string) {
  return review.options.find((option) => option.assets.some((asset) => asset.id === assetId))?.id ?? null;
}

function mergeComments(snapshotComments: Comment[], tableComments: Comment[]) {
  const byId = new Map<string, Comment>();
  snapshotComments.forEach((comment) => byId.set(comment.id, comment));
  tableComments.forEach((comment) => byId.set(comment.id, comment));
  return Array.from(byId.values());
}

function formatUpdatedAt(value: string | null) {
  if (!value) return 'just now';

  const updatedAt = new Date(value);
  const diffMs = Date.now() - updatedAt.getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return 'yesterday';
  return `${diffDays} days ago`;
}

function formatStatus(status: string | null) {
  if (!status) return 'Draft';
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

async function syncReviewRows(review: ReviewData) {
  const client = createSupabaseClientInstance();
  if (!client) return;

  const optionRows = review.options.map((option, sortOrder) => ({
    id: option.id,
    review_id: review.id,
    title: option.title,
    description: option.description,
    feedback: option.feedback ?? '',
    sort_order: sortOrder,
  }));

  if (optionRows.length > 0) {
    const { error } = await client.from(OPTION_TABLE).upsert(optionRows);
    if (error) {
      console.error('Failed to sync review options to Supabase:', error.message);
      throw new Error(`Failed to sync review options: ${error.message}`);
    }
  }

  const assetRows = review.options.flatMap((option) =>
    option.assets.map((asset, sortOrder) => ({
      id: asset.id,
      review_id: review.id,
      option_id: option.id,
      type: asset.kind,
      title: asset.title,
      description: asset.description,
      original_name: asset.originalName ?? null,
      original_mime_type: asset.originalMimeType ?? null,
      original_bytes: asset.originalBytes ?? null,
      preview_mime_type: asset.previewMimeType ?? null,
      preview_bytes: asset.previewBytes ?? null,
      storage_path: asset.storagePath ?? null,
      thumbnail_storage_path: asset.thumbnailStoragePath ?? null,
      width: asset.width ?? null,
      height: asset.height ?? null,
      page_number: asset.pageNumber ?? null,
      page_count: asset.pageCount ?? null,
      processing_status: asset.status ?? 'idle',
      sort_order: sortOrder,
    }))
  );

  if (assetRows.length > 0) {
    const { error } = await client.from(ASSET_TABLE).upsert(assetRows);
    if (error) {
      console.error('Failed to sync review assets to Supabase:', error.message);
      throw new Error(`Failed to sync review assets: ${error.message}`);
    }
  }
}

export async function loadReview(reviewId: string): Promise<ReviewData> {
  if (!isSupabaseConfigured()) {
    return initialReview;
  }

  const client = createSupabaseClientInstance();
  if (!client) {
    return initialReview;
  }

  const { data, error } = await client.from(REVIEW_TABLE).select('content').eq('id', reviewId).maybeSingle();

  if (error) {
    console.error('Failed to load review from Supabase:', error.message);
    return initialReview;
  }

  if (data?.content) {
    const review = normalizeReviewData(data.content as ReviewData);
    const { data: commentRows, error: commentError } = await client
      .from(COMMENT_TABLE)
      .select('id, asset_id, x_percent, y_percent, body, author_name')
      .eq('review_id', reviewId)
      .order('created_at', { ascending: true });

    if (commentError) {
      console.error('Failed to load comments from Supabase:', commentError.message);
      return review;
    }

    const tableComments = (commentRows ?? []).map((comment) => ({
      id: comment.id,
      assetId: comment.asset_id,
      x: Number(comment.x_percent ?? 0),
      y: Number(comment.y_percent ?? 0),
      text: comment.body,
      author: comment.author_name,
    }));

    return {
      ...review,
      comments: mergeComments(review.comments, tableComments),
    };
  }

  const { data: userData } = await client.auth.getUser();
  if (!userData.user) {
    return createEmptyReviewData(reviewId);
  }

  const emptyReview = createEmptyReviewData(reviewId);
  const { error: insertError } = await client.from(REVIEW_TABLE).upsert({
    id: reviewId,
    owner_id: userData.user.id,
    title: emptyReview.title,
    client_name: emptyReview.client,
    instructions: emptyReview.instructions,
    status: 'in_review',
    reviewer_name_required: emptyReview.shareSettings.reviewerNameRequired,
    pin_protection_enabled: emptyReview.shareSettings.pinProtection,
    allow_comments: emptyReview.shareSettings.allowComments,
    allow_decisions: emptyReview.shareSettings.allowDecisions,
    content: emptyReview,
    updated_at: new Date().toISOString(),
  });

  if (insertError) {
    console.error('Failed to seed review in Supabase:', insertError.message);
  }

  return emptyReview;
}

export async function listReviews(): Promise<ReviewSummary[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const client = createSupabaseClientInstance();
  if (!client) {
    return [];
  }

  const { data: userData } = await client.auth.getUser();
  if (!userData.user) {
    return [];
  }

  const { data, error } = await client
    .from(REVIEW_TABLE)
    .select('id, title, client_name, status, updated_at, content')
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load reviews: ${error.message}`);
  }

  return (data ?? []).map((row) => {
    const content = normalizeReviewData((row.content ?? createEmptyReviewData(row.id)) as ReviewData);
    return {
      id: row.id,
      title: row.title ?? content.title,
      client: row.client_name ?? content.client,
      status: formatStatus(row.status),
      updatedAt: formatUpdatedAt(row.updated_at),
      comments: content.comments.length,
    };
  });
}

export async function createReview(): Promise<ReviewData> {
  if (!isSupabaseConfigured()) {
    throw new Error('Connect Supabase before creating reviews.');
  }

  const client = createSupabaseClientInstance();
  if (!client) {
    throw new Error('Connect Supabase before creating reviews.');
  }

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) {
    throw new Error('Sign in to create a review.');
  }

  const reviewId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `review-${Date.now()}`;
  const review = createEmptyReviewData(reviewId);
  const now = new Date().toISOString();

  const { error } = await client.from(REVIEW_TABLE).insert({
    id: review.id,
    owner_id: userData.user.id,
    title: review.title,
    client_name: review.client,
    instructions: review.instructions,
    status: 'in_review',
    reviewer_name_required: review.shareSettings.reviewerNameRequired,
    pin_protection_enabled: review.shareSettings.pinProtection,
    allow_comments: review.shareSettings.allowComments,
    allow_decisions: review.shareSettings.allowDecisions,
    content: review,
    updated_at: now,
  });

  if (error) {
    throw new Error(`Failed to create review: ${error.message}`);
  }

  await syncReviewRows(review);
  return review;
}

export async function saveReview(review: ReviewData): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  const client = createSupabaseClientInstance();
  if (!client) {
    return;
  }

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) {
    throw new Error('Sign in to save reviews and upload previews.');
  }

  const { error } = await client.from(REVIEW_TABLE).upsert({
    id: review.id,
    owner_id: userData.user.id,
    title: review.title,
    client_name: review.client,
    instructions: review.instructions,
    status: getReviewStatus(review),
    reviewer_name_required: review.shareSettings.reviewerNameRequired,
    pin_protection_enabled: review.shareSettings.pinProtection,
    allow_comments: review.shareSettings.allowComments,
    allow_decisions: review.shareSettings.allowDecisions,
    content: review,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Failed to save review to Supabase:', error.message);
    throw new Error(`Failed to save review: ${error.message}`);
  }

  await syncReviewRows(review);
}

export async function saveComment(review: ReviewData, comment: Comment): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  const client = createSupabaseClientInstance();
  if (!client) {
    return;
  }

  await syncReviewRows(review);

  const optionId = findOptionIdForAsset(review, comment.assetId);
  const { error } = await client.from(COMMENT_TABLE).upsert({
    id: comment.id,
    review_id: review.id,
    asset_id: comment.assetId,
    option_id: optionId,
    author_name: comment.author,
    author_role: 'reviewer',
    body: comment.text,
    x_percent: comment.x,
    y_percent: comment.y,
    status: 'open',
  });

  if (error) {
    console.error('Failed to save comment to Supabase:', error.message);
  }
}
