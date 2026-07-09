import { initialReview, normalizeReviewData, versionLabel, type AssetVersion, type Comment, type ReviewAsset, type ReviewData } from '@/lib/mock-data';
import { createSupabaseClientInstance, isSupabaseConfigured } from '@/lib/supabase';

const REVIEW_TABLE = 'reviews';
const COMMENT_TABLE = 'comments';
const ASSET_TABLE = 'assets';
const ASSET_VERSION_TABLE = 'asset_versions';
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
  assetVersionId?: string | null;
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
  asset_version_id?: string | null;
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

interface DecisionRow {
  type: ReviewerDecisionType | null;
  note: string | null;
  asset_version_id?: string | null;
  option_id?: string | null;
}

type CommentActivityRow = ActivityRow & {
  parent_comment_id?: string | null;
  status?: 'open' | 'resolved' | null;
  updated_at?: string | null;
};

export function createEmptyReviewData(reviewId: string): ReviewData {
  const assetId = `asset-${reviewId}-a`;

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
    assets: [
      {
        id: assetId,
        reviewId,
        title: 'Primary asset',
        description: 'A reviewable asset for client feedback.',
        assetType: 'screenshot',
        sortOrder: 0,
        status: 'in_review',
        accent: 'from-stone-700 via-stone-500 to-stone-200',
        notes: 'Ready for review.',
        versions: [
          {
            id: `${assetId}-version-a`,
            assetId,
            reviewId,
            label: 'Version A',
            versionNumber: 1,
            sortOrder: 0,
            status: 'idle',
          },
        ],
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
  if (review.selectedAssetVersionId || review.selectedDirection) return 'direction_selected';
  return 'in_review';
}

function findAssetVersionIdForAsset(review: ReviewData, assetId: string) {
  return review.assets.find((asset) => asset.id === assetId)?.versions[0]?.id ?? null;
}

function findAssetForVersion(review: ReviewData, assetVersionId?: string | null) {
  if (!assetVersionId) return null;
  return review.assets.find((asset) => asset.versions.some((version) => version.id === assetVersionId)) ?? null;
}

function dbAssetType(assetType: string) {
  return assetType === 'image' || assetType === 'pdf' ? assetType : 'screenshot';
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

  const assetRows = review.assets.map((asset, sortOrder) => ({
    id: asset.id,
    review_id: review.id,
    type: dbAssetType(asset.assetType),
    title: asset.title,
    description: asset.description,
    processing_status: 'ready',
    sort_order: sortOrder,
  }));

  if (assetRows.length > 0) {
    const { error } = await client.from(ASSET_TABLE).upsert(assetRows);
    if (error) {
      console.error('Failed to sync review assets to Supabase:', error.message);
      throw new Error(`Failed to sync review assets: ${error.message}`);
    }
  }

  const versionRows = review.assets.flatMap((asset) =>
    asset.versions.map((version, sortOrder) => ({
      id: version.id,
      review_id: review.id,
      asset_id: asset.id,
      label: version.label,
      version_number: version.versionNumber,
      sort_order: sortOrder,
      source_url: version.sourceUrl ?? null,
      preview_url: version.previewUrl ?? null,
      thumbnail_url: version.thumbnailUrl ?? null,
      storage_path: version.storagePath ?? null,
      mime_type: version.mimeType ?? version.originalMimeType ?? version.previewMimeType ?? null,
      width: version.width ?? null,
      height: version.height ?? null,
      page_count: version.pageCount ?? null,
      preview_bytes: version.previewBytes ?? null,
      processing_status: version.status ?? 'idle',
      status: version.status ?? 'idle',
      metadata: {
        originalName: version.originalName ?? null,
        originalMimeType: version.originalMimeType ?? null,
        originalBytes: version.originalBytes ?? null,
        previewMimeType: version.previewMimeType ?? null,
        thumbnailStoragePath: version.thumbnailStoragePath ?? null,
        pageNumber: version.pageNumber ?? null,
        storageHint: version.storageHint ?? null,
      },
    }))
  );

  if (versionRows.length > 0) {
    const { error } = await client.from(ASSET_VERSION_TABLE).upsert(versionRows);
    if (error) {
      console.warn('Failed to sync asset versions to Supabase. Apply the asset_versions migration to enable structured version rows:', error.message);
    }
  }
}

async function loadCommentRows(reviewId: string): Promise<CommentRow[]> {
  const client = createSupabaseClientInstance();
  if (!client) return [];

  const richResult = await client
    .from(COMMENT_TABLE)
    .select('id, review_id, asset_id, asset_version_id, option_id, parent_comment_id, x_percent, y_percent, page_number, body, author_name, author_role, status, resolved_at, resolved_by, created_at, updated_at')
    .eq('review_id', reviewId)
    .order('created_at', { ascending: true });

  if (!richResult.error) {
    return (richResult.data ?? []) as CommentRow[];
  }

  console.warn('Falling back to legacy comment query:', richResult.error.message);

  const legacyResult = await client
    .from(COMMENT_TABLE)
    .select('id, asset_id, x_percent, y_percent, body, author_name')
    .eq('review_id', reviewId);

  if (legacyResult.error) {
    console.error('Failed to load comments from Supabase:', legacyResult.error.message);
    return [];
  }

  return ((legacyResult.data ?? []) as Array<{
    id: string;
    asset_id: string;
    x_percent: number | null;
    y_percent: number | null;
    body: string;
    author_name: string;
  }>).map((comment) => ({
    ...comment,
    review_id: reviewId,
    option_id: null,
    parent_comment_id: null,
    page_number: null,
    author_role: 'reviewer',
    status: 'open',
    resolved_at: null,
    resolved_by: null,
    created_at: null,
    updated_at: null,
  }));
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

  const commentRows = await loadCommentRows(row.id);
  const tableComments = commentRows.map((comment) => ({
    id: comment.id,
    reviewId: comment.review_id,
    assetId: comment.asset_id,
    assetVersionId: comment.asset_version_id ?? comment.option_id,
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

  const { data: richDecisionRows, error: richDecisionError } = await client
    .from(DECISION_TABLE)
    .select('type, note, asset_version_id, option_id')
    .eq('review_id', row.id)
    .order('created_at', { ascending: false })
    .limit(1);

  let decisionRows = (richDecisionRows ?? []) as DecisionRow[];
  if (richDecisionError) {
    console.warn('Falling back to legacy decision query:', richDecisionError.message);
    const { data: legacyDecisionRows, error: legacyDecisionError } = await client
      .from(DECISION_TABLE)
      .select('type, note, option_id')
      .eq('review_id', row.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (legacyDecisionError) {
      console.error('Failed to load review decisions from Supabase:', legacyDecisionError.message);
    } else {
      decisionRows = (legacyDecisionRows ?? []) as DecisionRow[];
    }
  }

  const latestDecision = decisionRows?.[0];

  return {
    ...reviewWithMetadata,
    comments: mergeComments(reviewWithMetadata.comments, tableComments),
    overallFeedback: feedbackRows?.[0]?.body ?? reviewWithMetadata.overallFeedback,
    decision: latestDecision?.note ?? reviewWithMetadata.decision,
    selectedDirection: latestDecision?.asset_version_id ?? latestDecision?.option_id ?? reviewWithMetadata.selectedDirection,
    selectedAssetVersionId: latestDecision?.asset_version_id ?? latestDecision?.option_id ?? reviewWithMetadata.selectedAssetVersionId,
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

  const { data: userData } = await client.auth.getUser();
  if (!userData.user) {
    return createEmptyReviewData(reviewId);
  }

  const { data, error } = await client
    .from(REVIEW_TABLE)
    .select('id, share_token, content')
    .eq('id', reviewId)
    .eq('owner_id', userData.user.id)
    .maybeSingle();

  if (error) {
    console.error('Failed to load review from Supabase:', error.message);
    return { ...initialReview, id: reviewId, shareToken: 'mock-share-token' };
  }

  if (data) {
    return hydrateReviewFromRow(data as ReviewRow);
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
      assets: [],
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
    .eq('owner_id', userData.user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load reviews: ${error.message}`);
  }

  const reviewIds = (data ?? []).map((row) => row.id);
  const emptyActivityResult: { data: ActivityRow[]; error: null } = { data: [], error: null };
  const [commentsResult, feedbackResult, decisionsResult] = reviewIds.length > 0
    ? await Promise.all([
        client.from(COMMENT_TABLE).select('review_id, parent_comment_id, status, created_at').in('review_id', reviewIds),
        client.from(FEEDBACK_TABLE).select('review_id, created_at').in('review_id', reviewIds),
        client.from(DECISION_TABLE).select('review_id, type, created_at').in('review_id', reviewIds),
      ])
    : [
        emptyActivityResult,
        emptyActivityResult,
        { data: [] as DecisionActivityRow[], error: null },
      ];

  let commentActivityRows = (commentsResult.data ?? []) as CommentActivityRow[];
  if (commentsResult.error) {
    console.warn('Falling back to legacy comment activity query:', commentsResult.error.message);
    const legacyCommentsResult = reviewIds.length > 0
      ? await client.from(COMMENT_TABLE).select('review_id, created_at').in('review_id', reviewIds)
      : emptyActivityResult;

    if (legacyCommentsResult.error) {
      throw new Error(`Failed to load comment activity: ${legacyCommentsResult.error.message}`);
    }

    commentActivityRows = (legacyCommentsResult.data ?? []) as CommentActivityRow[];
  }

  if (feedbackResult.error) {
    throw new Error(`Failed to load feedback activity: ${feedbackResult.error.message}`);
  }

  if (decisionsResult.error) {
    throw new Error(`Failed to load decision activity: ${decisionsResult.error.message}`);
  }

  return (data ?? []).map((row) => {
    const content = normalizeReviewData((row.content ?? createEmptyReviewData(row.id)) as ReviewData);
    const commentRows = commentActivityRows.filter((comment) => comment.review_id === row.id);
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

export async function deleteReview(reviewId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  const client = createSupabaseClientInstance();
  if (!client) {
    return;
  }

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) {
    throw new Error('Sign in to delete reviews.');
  }

  const { error } = await client
    .from(REVIEW_TABLE)
    .delete()
    .eq('id', reviewId);

  if (error) {
    console.error('Failed to delete review from Supabase:', error.message);
    throw new Error(`Failed to delete review: ${error.message}`);
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

export async function createAsset(review: ReviewData, payload: Partial<ReviewAsset>): Promise<ReviewAsset> {
  const assetId = payload.id ?? (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `asset-${Date.now()}`);
  const asset: ReviewAsset = {
    id: assetId,
    reviewId: review.id,
    title: payload.title ?? 'Review asset',
    description: payload.description ?? 'A reviewable asset.',
    instructions: payload.instructions,
    assetType: payload.assetType ?? 'screenshot',
    sortOrder: payload.sortOrder ?? review.assets.length,
    status: payload.status ?? 'in_review',
    accent: payload.accent ?? 'from-stone-700 via-stone-500 to-stone-200',
    notes: payload.notes ?? 'Ready for review.',
    versions: payload.versions ?? [],
    metadata: payload.metadata,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
  };

  await saveReview({ ...review, assets: [...review.assets, asset] });
  return asset;
}

export async function updateAsset(review: ReviewData, assetId: string, payload: Partial<ReviewAsset>): Promise<ReviewAsset> {
  const existingAsset = review.assets.find((asset) => asset.id === assetId);
  if (!existingAsset) throw new Error('Asset not found.');

  const nextAsset = { ...existingAsset, ...payload, id: assetId };
  await saveReview({
    ...review,
    assets: review.assets.map((asset) => (asset.id === assetId ? nextAsset : asset)),
  });
  return nextAsset;
}

export async function deleteAsset(review: ReviewData, assetId: string): Promise<void> {
  const nextReview = {
    ...review,
    assets: review.assets.filter((asset) => asset.id !== assetId),
    comments: review.comments.filter((comment) => comment.assetId !== assetId),
    selectedAssetVersionId: findAssetForVersion(review, review.selectedAssetVersionId)?.id === assetId ? null : review.selectedAssetVersionId,
    selectedDirection: findAssetForVersion(review, review.selectedDirection)?.id === assetId ? null : review.selectedDirection,
  };

  if (isSupabaseConfigured()) {
    const client = createSupabaseClientInstance();
    if (client) {
      const { error } = await client.from(ASSET_TABLE).delete().eq('id', assetId).eq('review_id', review.id);
      if (error) {
        console.error('Failed to delete asset from Supabase:', error.message);
        throw new Error(`Failed to delete asset: ${error.message}`);
      }
    }
  }

  await saveReview(nextReview);
}

export async function createAssetVersion(review: ReviewData, assetId: string, payload: Partial<AssetVersion>): Promise<AssetVersion> {
  const asset = review.assets.find((candidate) => candidate.id === assetId);
  if (!asset) throw new Error('Asset not found.');

  const versionIndex = asset.versions.length;
  const version: AssetVersion = {
    id: payload.id ?? (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${assetId}-version-${Date.now()}`),
    assetId,
    reviewId: review.id,
    label: payload.label ?? versionLabel(versionIndex),
    versionNumber: payload.versionNumber ?? versionIndex + 1,
    sortOrder: payload.sortOrder ?? versionIndex,
    sourceUrl: payload.sourceUrl,
    originalName: payload.originalName,
    originalMimeType: payload.originalMimeType,
    originalBytes: payload.originalBytes,
    previewUrl: payload.previewUrl,
    thumbnailUrl: payload.thumbnailUrl,
    previewMimeType: payload.previewMimeType,
    previewBytes: payload.previewBytes,
    storagePath: payload.storagePath,
    thumbnailStoragePath: payload.thumbnailStoragePath,
    mimeType: payload.mimeType,
    width: payload.width,
    height: payload.height,
    pageNumber: payload.pageNumber,
    pageCount: payload.pageCount,
    status: payload.status ?? 'idle',
    storageHint: payload.storageHint,
    metadata: payload.metadata,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
  };

  await saveReview({
    ...review,
    assets: review.assets.map((candidate) =>
      candidate.id === assetId ? { ...candidate, versions: [...candidate.versions, version] } : candidate
    ),
  });
  return version;
}

export async function updateAssetVersion(review: ReviewData, assetVersionId: string, payload: Partial<AssetVersion>): Promise<AssetVersion> {
  const asset = findAssetForVersion(review, assetVersionId);
  const existingVersion = asset?.versions.find((version) => version.id === assetVersionId);
  if (!asset || !existingVersion) throw new Error('Asset version not found.');

  const nextVersion = { ...existingVersion, ...payload, id: assetVersionId, assetId: asset.id };
  await saveReview({
    ...review,
    assets: review.assets.map((candidate) =>
      candidate.id === asset.id
        ? { ...candidate, versions: candidate.versions.map((version) => (version.id === assetVersionId ? nextVersion : version)) }
        : candidate
    ),
  });
  return nextVersion;
}

export async function deleteAssetVersion(review: ReviewData, assetVersionId: string): Promise<void> {
  const nextReview = {
    ...review,
    assets: review.assets.map((asset) => ({
      ...asset,
      versions: asset.versions.filter((version) => version.id !== assetVersionId),
    })),
    comments: review.comments.filter((comment) => comment.assetVersionId !== assetVersionId),
    selectedAssetVersionId: review.selectedAssetVersionId === assetVersionId ? null : review.selectedAssetVersionId,
    selectedDirection: review.selectedDirection === assetVersionId ? null : review.selectedDirection,
  };

  if (isSupabaseConfigured()) {
    const client = createSupabaseClientInstance();
    if (client) {
      const { error } = await client.from(ASSET_VERSION_TABLE).delete().eq('id', assetVersionId).eq('review_id', review.id);
      if (error) {
        console.warn('Failed to delete asset version row from Supabase. Apply the asset_versions migration to enable structured version deletes:', error.message);
      }
    }
  }

  await saveReview(nextReview);
}

export async function attachPreviewToAssetVersion(review: ReviewData, assetVersionId: string, payload: Partial<AssetVersion>): Promise<AssetVersion> {
  return updateAssetVersion(review, assetVersionId, payload);
}

export async function saveComment(review: ReviewData, comment: Comment): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  const client = createSupabaseClientInstance();
  if (!client) {
    return;
  }

  const assetVersionId = comment.assetVersionId ?? findAssetVersionIdForAsset(review, comment.assetId);
  const commentRow = {
    id: comment.id,
    review_id: review.id,
    asset_id: comment.assetId,
    asset_version_id: assetVersionId,
    option_id: null,
    parent_comment_id: null,
    author_name: comment.author,
    author_role: comment.authorRole ?? 'reviewer',
    body: comment.text,
    x_percent: comment.x ?? null,
    y_percent: comment.y ?? null,
    page_number: comment.pageNumber ?? null,
    status: 'open',
  };

  const { error } = await client.from(COMMENT_TABLE).insert(commentRow);

  if (error) {
    console.warn('Falling back to legacy comment insert:', error.message);
    const { asset_version_id: _assetVersionId, ...legacyCommentRow } = commentRow;
    const legacyResult = await client.from(COMMENT_TABLE).insert(legacyCommentRow);

    if (legacyResult.error) {
      console.error('Failed to save comment to Supabase:', legacyResult.error.message);
      throw new Error(`Failed to save comment: ${legacyResult.error.message}`);
    }
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
    assetVersionId: parentComment.assetVersionId ?? findAssetVersionIdForAsset(input.review, parentComment.assetId),
    optionId: null,
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

  const replyRow = {
    id: reply.id,
    review_id: input.review.id,
    asset_id: reply.assetId,
    asset_version_id: reply.assetVersionId ?? null,
    option_id: null,
    parent_comment_id: input.parentCommentId,
    author_name: input.authorName,
    author_role: input.authorRole,
    body: input.body,
    status: 'open',
  };

  const { error } = await client.from(COMMENT_TABLE).insert(replyRow);

  if (error) {
    console.warn('Falling back to legacy reply insert:', error.message);
    const { asset_version_id: _assetVersionId, ...legacyReplyRow } = replyRow;
    const legacyResult = await client.from(COMMENT_TABLE).insert(legacyReplyRow);

    if (legacyResult.error) {
      console.error('Failed to save comment reply to Supabase:', legacyResult.error.message);
      throw new Error(`Failed to save reply: ${legacyResult.error.message}`);
    }
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

  const decisionRow = {
    id: decisionId,
    review_id: input.reviewId,
    asset_version_id: input.assetVersionId ?? null,
    option_id: null,
    reviewer_name: input.reviewerName,
    type: input.type,
    note: input.note,
  };

  const { error } = await client.from(DECISION_TABLE).insert(decisionRow);

  if (error) {
    console.warn('Falling back to legacy decision insert:', error.message);
    const { asset_version_id: _assetVersionId, ...legacyDecisionRow } = decisionRow;
    const legacyResult = await client.from(DECISION_TABLE).insert(legacyDecisionRow);

    if (legacyResult.error) {
      console.error('Failed to save reviewer decision to Supabase:', legacyResult.error.message);
      throw new Error(`Failed to save decision: ${legacyResult.error.message}`);
    }
  }
}
