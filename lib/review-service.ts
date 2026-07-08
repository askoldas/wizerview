import { initialReview, normalizeReviewData, type Comment, type ReviewData } from '@/lib/mock-data';
import { createSupabaseClientInstance, isSupabaseConfigured } from '@/lib/supabase';

const REVIEW_TABLE = 'reviews';
const COMMENT_TABLE = 'comments';
const OPTION_TABLE = 'review_options';
const ASSET_TABLE = 'assets';
const DECISION_TABLE = 'decisions';
const FEEDBACK_TABLE = 'review_feedback';

export interface ReviewSummary {
  id: string;
  title: string;
  client: string;
  status: string;
  updatedAt: string;
  comments: number;
  newComments: number;
  feedback: number;
  newFeedback: number;
  totalActivity: number;
  newActivity: number;
}

export type ReviewerDecisionType = 'approved' | 'changes_requested' | 'direction_selected' | 'combine_options';

export interface ReviewerDecisionInput {
  reviewId: string;
  optionId?: string | null;
  reviewerName: string;
  type: ReviewerDecisionType;
  note: string;
}

export interface ReviewerFeedbackInput {
  reviewId: string;
  reviewerName: string;
  body: string;
}

interface ActivityRow {
  review_id: string;
  created_at: string | null;
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
        title: 'Version A',
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

function isNewerThanSeen(createdAt: string | null, creatorSeenAt: string | null) {
  if (!createdAt) return false;
  if (!creatorSeenAt) return true;
  return new Date(createdAt).getTime() > new Date(creatorSeenAt).getTime();
}

function countActivityByReview<T extends { review_id: string; created_at: string | null }>(rows: T[] | null, reviewId: string, creatorSeenAt: string | null) {
  const matchingRows = (rows ?? []).filter((row) => row.review_id === reviewId);
  return {
    total: matchingRows.length,
    new: matchingRows.filter((row) => isNewerThanSeen(row.created_at, creatorSeenAt)).length,
  };
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

    const { data: feedbackRows, error: feedbackError } = await client
      .from(FEEDBACK_TABLE)
      .select('body')
      .eq('review_id', reviewId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (feedbackError) {
      console.error('Failed to load review feedback from Supabase:', feedbackError.message);
    }

    const { data: decisionRows, error: decisionError } = await client
      .from(DECISION_TABLE)
      .select('type, note, option_id')
      .eq('review_id', reviewId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (decisionError) {
      console.error('Failed to load review decisions from Supabase:', decisionError.message);
    }

    const latestDecision = decisionRows?.[0];

    return {
      ...review,
      comments: mergeComments(review.comments, tableComments),
      overallFeedback: feedbackRows?.[0]?.body ?? review.overallFeedback,
      decision: latestDecision?.note ?? review.decision,
      selectedDirection: latestDecision?.option_id ?? review.selectedDirection,
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
    .select('id, title, client_name, status, updated_at, creator_seen_at, content')
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load reviews: ${error.message}`);
  }

  const reviewIds = (data ?? []).map((row) => row.id);
  const emptyActivityResult: { data: ActivityRow[]; error: null } = { data: [], error: null };
  const [commentsResult, feedbackResult] = reviewIds.length > 0
    ? await Promise.all([
        client.from(COMMENT_TABLE).select('review_id, created_at').in('review_id', reviewIds),
        client.from(FEEDBACK_TABLE).select('review_id, created_at').in('review_id', reviewIds),
      ])
    : [
        emptyActivityResult,
        emptyActivityResult,
      ];

  if (commentsResult.error) {
    throw new Error(`Failed to load comment activity: ${commentsResult.error.message}`);
  }

  if (feedbackResult.error) {
    throw new Error(`Failed to load feedback activity: ${feedbackResult.error.message}`);
  }

  return (data ?? []).map((row) => {
    const content = normalizeReviewData((row.content ?? createEmptyReviewData(row.id)) as ReviewData);
    const comments = countActivityByReview(commentsResult.data, row.id, row.creator_seen_at);
    const feedback = countActivityByReview(feedbackResult.data, row.id, row.creator_seen_at);

    return {
      id: row.id,
      title: row.title ?? content.title,
      client: row.client_name ?? content.client,
      status: formatStatus(row.status),
      updatedAt: formatUpdatedAt(row.updated_at),
      comments: comments.total,
      newComments: comments.new,
      feedback: feedback.total,
      newFeedback: feedback.new,
      totalActivity: comments.total + feedback.total,
      newActivity: comments.new + feedback.new,
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
    creator_seen_at: now,
    updated_at: now,
  });

  if (error) {
    throw new Error(`Failed to create review: ${error.message}`);
  }

  await syncReviewRows(review);
  return review;
}

export async function markReviewSeen(reviewId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  const client = createSupabaseClientInstance();
  if (!client) {
    return;
  }

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) {
    return;
  }

  const { data, error } = await client
    .from(REVIEW_TABLE)
    .update({ creator_seen_at: new Date().toISOString() })
    .eq('id', reviewId)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('Failed to mark review activity as seen:', error.message);
    throw new Error(`Failed to mark review as seen: ${error.message}`);
  }

  if (!data) {
    throw new Error('Failed to mark review as seen: no review row was updated.');
  }
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
    throw new Error(`Failed to save comment: ${error.message}`);
  }
}

export async function saveReviewerFeedback(input: ReviewerFeedbackInput): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  const client = createSupabaseClientInstance();
  if (!client) {
    return;
  }

  const feedbackId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `feedback-${Date.now()}`;

  const { error } = await client.from(FEEDBACK_TABLE).insert({
    id: feedbackId,
    review_id: input.reviewId,
    reviewer_name: input.reviewerName,
    body: input.body,
  });

  if (error) {
    console.error('Failed to save reviewer feedback to Supabase:', error.message);
    throw new Error(`Failed to save feedback: ${error.message}`);
  }
}

export async function saveReviewerDecision(input: ReviewerDecisionInput): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  const client = createSupabaseClientInstance();
  if (!client) {
    return;
  }

  const decisionId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `decision-${Date.now()}`;

  const { error } = await client.from(DECISION_TABLE).insert({
    id: decisionId,
    review_id: input.reviewId,
    option_id: input.optionId ?? null,
    reviewer_name: input.reviewerName,
    type: input.type,
    note: input.note,
  });

  if (error) {
    console.error('Failed to save reviewer decision to Supabase:', error.message);
    throw new Error(`Failed to save decision: ${error.message}`);
  }
}
