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
  shareToken?: string;
  title: string;
  client: string;
  status: string;
  updatedAt: string;
  comments: number;
  openComments: number;
  resolvedComments: number;
  newComments: number;
  feedback: number;
  newFeedback: number;
  decisions: number;
  totalActivity: number;
  newActivity: number;
  latestActivityAt: string;
  latestActivityLabel: string;
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

export interface CommentReplyInput {
  review: ReviewData;
  parentCommentId: string;
  body: string;
  authorName: string;
  authorRole: 'creator' | 'reviewer';
}

export interface CommentStatusInput {
  reviewId: string;
  commentId: string;
  resolvedBy: string;
}

interface ReviewRow {
  id: string;
  share_token: string | null;
  content: ReviewData | null;
}

interface ActivityRow {
  review_id: string;
  created_at: string | null;
}

interface CommentRow extends ActivityRow {
  id: string;
  asset_id: string;
  option_id: string | null;
  parent_comment_id: string | null;
  x_percent: number | null;
  y_percent: number | null;
  page_number: number | null;
  body: string;
  author_name: string;
  author_role: 'creator' | 'reviewer' | null;
  status: 'open' | 'resolved' | null;
  resolved_at: string | null;
  resolved_by: string | null;
  updated_at: string | null;
}

interface DecisionActivityRow extends ActivityRow {
  type: ReviewerDecisionType | null;
}

export function createEmptyReviewData(reviewId: string): ReviewData {
  return {
    id: reviewId,
    shareToken: undefined,
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
  flattenComments(snapshotComments).forEach((comment) => byId.set(comment.id, { ...comment, replies: [] }));
  tableComments.forEach((comment) => byId.set(comment.id, comment));
  return groupCommentsWithReplies(Array.from(byId.values()));
}

export function groupCommentsWithReplies(comments: Comment[]): Comment[] {
  const byId = new Map<string, Comment>();
  const roots: Comment[] = [];

  comments.forEach((comment) => {
    byId.set(comment.id, {
      ...comment,
      authorRole: comment.authorRole ?? 'reviewer',
      status: comment.status ?? 'open',
      parentCommentId: comment.parentCommentId ?? null,
      replies: [],
    });
  });

  byId.forEach((comment) => {
    if (comment.parentCommentId && byId.has(comment.parentCommentId)) {
      byId.get(comment.parentCommentId)?.replies?.push(comment);
    } else {
      roots.push(comment);
    }
  });

  const sortByCreatedAt = (a: Comment, b: Comment) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
  roots.sort(sortByCreatedAt);
  roots.forEach((comment) => comment.replies?.sort(sortByCreatedAt));
  return roots;
}

export function flattenComments(comments: Comment[]): Comment[] {
  return comments.flatMap((comment) => [comment, ...(comment.replies ?? [])]);
}

export function getOpenCommentCount(comments: Comment[]) {
  return comments.filter((comment) => !comment.parentCommentId && (comment.status ?? 'open') === 'open').length;
}

export function getResolvedCommentCount(comments: Comment[]) {
  return comments.filter((comment) => !comment.parentCommentId && comment.status === 'resolved').length;
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

async function hydrateReviewFromRow(row: ReviewRow): Promise<ReviewData> {
  const review = normalizeReviewData((row.content ?? createEmptyReviewData(row.id)) as ReviewData);
  const reviewWithMetadata = {
    ...review,
    id: row.id,
    shareToken: row.share_token ?? review.shareToken,
  };

  const client = createSupabaseClientInstance();
  if (!client) return reviewWithMetadata;

  const { data: commentRows, error: commentError } = await client
    .from(COMMENT_TABLE)
    .select('id, review_id, asset_id, option_id, parent_comment_id, x_percent, y_percent, page_number, body, author_name, author_role, status, resolved_at, resolved_by, created_at, updated_at')
    .eq('review_id', row.id)
    .order('created_at', { ascending: true });

  if (commentError) {
    console.error('Failed to load comments from Supabase:', commentError.message);
    return reviewWithMetadata;
  }

  const tableComments = ((commentRows ?? []) as CommentRow[]).map((comment) => ({
    id: comment.id,
    reviewId: comment.review_id,
    assetId: comment.asset_id,
    optionId: comment.option_id,
    parentCommentId: comment.parent_comment_id,
    x: comment.x_percent == null ? undefined : Number(comment.x_percent),
    y: comment.y_percent == null ? undefined : Number(comment.y_percent),
    pageNumber: comment.page_number,
    text: comment.body,
    author: comment.author_name,
    authorRole: comment.author_role ?? 'reviewer',
    status: comment.status ?? 'open',
    resolvedAt: comment.resolved_at,
    resolvedBy: comment.resolved_by,
    createdAt: comment.created_at,
    updatedAt: comment.updated_at,
  }));

  const { data: feedbackRows, error: feedbackError } = await client
    .from(FEEDBACK_TABLE)
    .select('body')
    .eq('review_id', row.id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (feedbackError) {
    console.error('Failed to load review feedback from Supabase:', feedbackError.message);
  }

  const { data: decisionRows, error: decisionError } = await client
    .from(DECISION_TABLE)
    .select('type, note, option_id')
    .eq('review_id', row.id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (decisionError) {
    console.error('Failed to load review decisions from Supabase:', decisionError.message);
  }

  const latestDecision = decisionRows?.[0];

  return {
    ...reviewWithMetadata,
    comments: mergeComments(reviewWithMetadata.comments, tableComments),
    overallFeedback: feedbackRows?.[0]?.body ?? reviewWithMetadata.overallFeedback,
    decision: latestDecision?.note ?? reviewWithMetadata.decision,
    selectedDirection: latestDecision?.option_id ?? reviewWithMetadata.selectedDirection,
  };
}

export async function loadReviewById(reviewId: string): Promise<ReviewData> {
  if (!isSupabaseConfigured()) {
    return { ...initialReview, id: reviewId, shareToken: 'mock-share-token' };
  }

  const client = createSupabaseClientInstance();
  if (!client) {
    return { ...initialReview, id: reviewId, shareToken: 'mock-share-token' };
  }

  const { data, error } = await client.from(REVIEW_TABLE).select('id, share_token, content').eq('id', reviewId).maybeSingle();

  if (error) {
    console.error('Failed to load review from Supabase:', error.message);
    return { ...initialReview, id: reviewId, shareToken: 'mock-share-token' };
  }

  if (data) {
    return hydrateReviewFromRow(data as ReviewRow);
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

export async function loadReviewByShareToken(shareToken: string): Promise<ReviewData> {
  if (!isSupabaseConfigured()) {
    return { ...initialReview, shareToken };
  }

  const client = createSupabaseClientInstance();
  if (!client) {
    return { ...initialReview, shareToken };
  }

  const { data, error } = await client
    .from(REVIEW_TABLE)
    .select('id, share_token, content')
    .eq('share_token', shareToken)
    .not('status', 'in', '("draft","archived")')
    .maybeSingle();

  if (error) {
    console.error('Failed to load shared review from Supabase:', error.message);
    return { ...initialReview, shareToken };
  }

  if (!data) {
    return {
      ...createEmptyReviewData('shared-review-unavailable'),
      shareToken,
      title: 'Review link unavailable',
      instructions: 'This shared review is not available. It may still be a draft, archived, or the link may be incorrect.',
      options: [],
    };
  }

  return hydrateReviewFromRow(data as ReviewRow);
}

export async function loadReview(reviewId: string): Promise<ReviewData> {
  return loadReviewById(reviewId);
}

export async function getReviewShareToken(reviewId: string): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    return 'mock-share-token';
  }

  const client = createSupabaseClientInstance();
  if (!client) return null;

  const { data, error } = await client
    .from(REVIEW_TABLE)
    .select('share_token')
    .eq('id', reviewId)
    .maybeSingle();

  if (error) {
    console.error('Failed to load review share token from Supabase:', error.message);
    throw new Error(`Failed to load review share token: ${error.message}`);
  }

  return data?.share_token ?? null;
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
    .select('id, share_token, title, client_name, status, updated_at, creator_seen_at, content')
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load reviews: ${error.message}`);
  }

  const reviewIds = (data ?? []).map((row) => row.id);
  const emptyActivityResult: { data: ActivityRow[]; error: null } = { data: [], error: null };
  const [commentsResult, feedbackResult] = reviewIds.length > 0
    ? await Promise.all([
        client.from(COMMENT_TABLE).select('review_id, parent_comment_id, status, created_at, updated_at').in('review_id', reviewIds),
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

  const decisionsResult = reviewIds.length > 0
    ? await client.from(DECISION_TABLE).select('review_id, type, created_at').in('review_id', reviewIds)
    : { data: [] as DecisionActivityRow[], error: null };

  if (decisionsResult.error) {
    throw new Error(`Failed to load decision activity: ${decisionsResult.error.message}`);
  }

  return (data ?? []).map((row) => {
    const content = normalizeReviewData((row.content ?? createEmptyReviewData(row.id)) as ReviewData);
    const commentRows = ((commentsResult.data ?? []) as Array<ActivityRow & { parent_comment_id?: string | null; status?: string | null; updated_at?: string | null }>).filter((comment) => comment.review_id === row.id);
    const topLevelComments = commentRows.filter((comment) => !comment.parent_comment_id);
    const comments = {
      total: topLevelComments.length,
      new: commentRows.filter((comment) => isNewerThanSeen(comment.created_at, row.creator_seen_at)).length,
    };
    const feedback = countActivityByReview(feedbackResult.data, row.id, row.creator_seen_at);
    const decisions = countActivityByReview(decisionsResult.data, row.id, row.creator_seen_at);
    const latestActivity = [
      ...commentRows.map((comment) => ({ at: comment.updated_at ?? comment.created_at, label: comment.parent_comment_id ? 'New reply' : 'New comment' })),
      ...((feedbackResult.data ?? []) as ActivityRow[]).filter((feedbackRow) => feedbackRow.review_id === row.id).map((feedbackRow) => ({ at: feedbackRow.created_at, label: 'New feedback' })),
      ...((decisionsResult.data ?? []) as DecisionActivityRow[]).filter((decision) => decision.review_id === row.id).map((decision) => ({ at: decision.created_at, label: decision.type ? formatStatus(decision.type) : 'New decision' })),
    ]
      .filter((activity) => activity.at)
      .sort((a, b) => new Date(b.at ?? 0).getTime() - new Date(a.at ?? 0).getTime())[0];

    return {
      id: row.id,
      shareToken: row.share_token ?? undefined,
      title: row.title ?? content.title,
      client: row.client_name ?? content.client,
      status: formatStatus(row.status),
      updatedAt: formatUpdatedAt(row.updated_at),
      comments: comments.total,
      openComments: topLevelComments.filter((comment) => comment.status !== 'resolved').length,
      resolvedComments: topLevelComments.filter((comment) => comment.status === 'resolved').length,
      newComments: comments.new,
      feedback: feedback.total,
      newFeedback: feedback.new,
      decisions: decisions.total,
      totalActivity: commentRows.length + feedback.total + decisions.total,
      newActivity: comments.new + feedback.new + decisions.new,
      latestActivityAt: latestActivity?.at ? formatUpdatedAt(latestActivity.at) : row.updated_at ? formatUpdatedAt(row.updated_at) : 'just now',
      latestActivityLabel: latestActivity?.label ?? 'No activity yet',
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

  const { data, error } = await client.from(REVIEW_TABLE).insert({
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
  }).select('share_token').single();

  if (error) {
    throw new Error(`Failed to create review: ${error.message}`);
  }

  const reviewWithToken = { ...review, shareToken: data?.share_token ?? review.shareToken };
  await syncReviewRows(reviewWithToken);
  return reviewWithToken;
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
    content: { ...review, shareToken: undefined },
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
  const { error } = await client.from(COMMENT_TABLE).insert({
    id: comment.id,
    review_id: review.id,
    asset_id: comment.assetId,
    option_id: optionId,
    parent_comment_id: null,
    author_name: comment.author,
    author_role: comment.authorRole ?? 'reviewer',
    body: comment.text,
    x_percent: comment.x ?? null,
    y_percent: comment.y ?? null,
    page_number: comment.pageNumber ?? null,
    status: 'open',
  });

  if (error) {
    console.error('Failed to save comment to Supabase:', error.message);
    throw new Error(`Failed to save comment: ${error.message}`);
  }
}

export async function saveCommentReply(input: CommentReplyInput): Promise<Comment> {
  const parentComment = flattenComments(input.review.comments).find((comment) => comment.id === input.parentCommentId);
  if (!parentComment) {
    throw new Error('Could not find the comment thread to reply to.');
  }

  const reply: Comment = {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `reply-${Date.now()}`,
    reviewId: input.review.id,
    assetId: parentComment.assetId,
    optionId: parentComment.optionId ?? findOptionIdForAsset(input.review, parentComment.assetId),
    parentCommentId: input.parentCommentId,
    text: input.body,
    author: input.authorName,
    authorRole: input.authorRole,
    status: 'open',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    replies: [],
  };

  if (!isSupabaseConfigured()) {
    return reply;
  }

  const client = createSupabaseClientInstance();
  if (!client) {
    return reply;
  }

  const { error } = await client.from(COMMENT_TABLE).insert({
    id: reply.id,
    review_id: input.review.id,
    asset_id: reply.assetId,
    option_id: reply.optionId ?? null,
    parent_comment_id: input.parentCommentId,
    author_name: input.authorName,
    author_role: input.authorRole,
    body: input.body,
    status: 'open',
  });

  if (error) {
    console.error('Failed to save comment reply to Supabase:', error.message);
    throw new Error(`Failed to save reply: ${error.message}`);
  }

  return reply;
}

export async function resolveComment(input: CommentStatusInput): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  const client = createSupabaseClientInstance();
  if (!client) return;

  const { error } = await client
    .from(COMMENT_TABLE)
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: input.resolvedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.commentId)
    .eq('review_id', input.reviewId)
    .is('parent_comment_id', null);

  if (error) {
    console.error('Failed to resolve comment in Supabase:', error.message);
    throw new Error(`Failed to resolve comment: ${error.message}`);
  }
}

export async function reopenComment(input: CommentStatusInput): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  const client = createSupabaseClientInstance();
  if (!client) return;

  const { error } = await client
    .from(COMMENT_TABLE)
    .update({
      status: 'open',
      resolved_at: null,
      resolved_by: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.commentId)
    .eq('review_id', input.reviewId)
    .is('parent_comment_id', null);

  if (error) {
    console.error('Failed to reopen comment in Supabase:', error.message);
    throw new Error(`Failed to reopen comment: ${error.message}`);
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
