import { initialReview, normalizeReviewData, versionLabel, type AssetVersion, type Comment, type DecisionOutcome, type ReviewAsset, type ReviewData, type ReviewGoal } from '@/lib/mock-data';
import { createSupabaseClientInstance, isSupabaseConfigured } from '@/lib/supabase';
import type { ActiveWorkUsage } from '@/lib/domain';

const REVIEW_TABLE = 'reviews';
const COMMENT_TABLE = 'comments';
const ASSET_TABLE = 'assets';
const ASSET_VERSION_TABLE = 'asset_versions';
const DECISION_TABLE = 'decisions';
const FEEDBACK_TABLE = 'review_feedback';
const REVIEW_SELECT_WITH_BRIEF = 'id, share_token, title, client_name, instructions, review_goal, client_visible, brief_message, brief_focus_points, brief_requested_outcome, brief_updated_at, reviewer_name_required, pin_protection_enabled, allow_comments, allow_decisions, content';
const REVIEW_SELECT_LEGACY = 'id, share_token, title, client_name, instructions, reviewer_name_required, pin_protection_enabled, allow_comments, allow_decisions, content';

export interface ReviewSummary {
  id: string;
  projectId?: string | null;
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

export interface ProjectSummary {
  id: string;
  name: string;
  client: string;
  description: string;
  status: string;
  shareToken?: string;
  reviews: ReviewSummary[];
}

export type ProjectRequestStatus = 'new' | 'discussing' | 'in_progress' | 'ready_for_review' | 'closed' | 'declined';

export interface ProjectRequestSummary {
  id: string;
  projectId: string;
  title: string;
  brief: string;
  status: ProjectRequestStatus;
  requestedByName: string;
  linkedReviewId: string | null;
  updatedAt: string;
}

export interface CreatorProjectRequestDetail extends ProjectRequestSummary {
  references: Array<{ id: string; type: string; title: string | null; url: string | null; note: string | null; createdByRole: 'client' | 'creator'; createdByName: string | null }>;
  messages: Array<{ id: string; authorRole: 'client' | 'creator'; authorName: string; body: string; createdAt: string }>;
}

export interface SharedProject {
  requiresAccessCode?: boolean;
  requiresAuthentication?: boolean;
  title: string;
  client: string;
  description: string;
  reviews: Array<{ title: string; status: string; shareToken: string; updatedAt: string; deliverableCount: number; openCommentCount: number }>;
  requests?: Array<{ id: string; title: string; status: string; requestedByName: string; linkedReviewShareToken?: string | null; updatedAt: string; messageCount: number }>;
  allowClientRequests?: boolean;
}

export async function addSharedProjectRequest(input: { shareToken: string; reviewerName: string; title: string; brief: string }) {
  const client = createSupabaseClientInstance();
  if (!client) throw new Error('This project is not available.');
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `request-${Date.now()}`;
  const { error } = await client.rpc('add_shared_project_request', { p_share_token: input.shareToken, p_request_id: id, p_reviewer_name: input.reviewerName, p_title: input.title, p_brief: input.brief });
  if (error) throw new Error('Could not send the request. Please try again.');
}

export interface SharedProjectRequest {
  projectTitle: string;
  request: { id: string; title: string; brief: string; status: ProjectRequestStatus; requestedByName: string; updatedAt: string };
  references: Array<{ id: string; type: 'image' | 'pdf' | 'link'; title?: string | null; url?: string | null; note?: string | null; createdByRole: 'client' | 'creator'; createdByName?: string | null }>;
  messages: Array<{ id: string; authorRole: 'client' | 'creator'; authorName: string; body: string; createdAt: string }>;
  allowClientRequestReplies: boolean;
  allowClientRequestReferences: boolean;
}

function newRequestId(prefix: string) {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${prefix}-${Date.now()}`;
}

async function saveSharedReviewInteraction(input: Record<string, unknown>) {
  const response = await fetch('/api/review-interactions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error ?? 'Could not save this review interaction.');
  }
}

export async function loadSharedProjectRequest(shareToken: string, requestId: string, accessCode?: string): Promise<SharedProjectRequest | null> {
  const client = createSupabaseClientInstance();
  if (!client) return null;
  const { data, error } = await client.rpc('get_shared_project_request', { p_share_token: shareToken, p_request_id: requestId, p_access_code: accessCode ?? null });
  if (error || !data || typeof data !== 'object') return null;
  return data as SharedProjectRequest;
}

export async function addSharedProjectRequestMessage(input: { shareToken: string; requestId: string; accessCode?: string; authorName: string; body: string }) {
  const client = createSupabaseClientInstance();
  if (!client) throw new Error('This request is not available.');
  const { error } = await client.rpc('add_shared_project_request_message', { p_share_token: input.shareToken, p_request_id: input.requestId, p_access_code: input.accessCode ?? null, p_message_id: newRequestId('request-message'), p_author_name: input.authorName, p_body: input.body });
  if (error) throw new Error('Could not send the reply. Please try again.');
}

export async function addSharedProjectRequestLink(input: { shareToken: string; requestId: string; accessCode?: string; authorName: string; title: string; url: string; note: string }) {
  const client = createSupabaseClientInstance();
  if (!client) throw new Error('This request is not available.');
  const { error } = await client.rpc('add_shared_project_request_link', { p_share_token: input.shareToken, p_request_id: input.requestId, p_access_code: input.accessCode ?? null, p_reference_id: newRequestId('request-reference'), p_author_name: input.authorName, p_title: input.title, p_url: input.url, p_note: input.note });
  if (error) throw new Error('Could not add the reference. Please try again.');
}

export type ReviewerDecisionType = 'reviewed' | 'approved' | 'changes_requested' | 'direction_selected' | 'combine_options';

export interface ReviewerDecisionInput {
  reviewId: string;
  assetId: string;
  shareToken?: string;
  assetVersionId?: string | null;
  reviewerName: string;
  type: ReviewerDecisionType;
  note: string;
}

export interface ReviewerFeedbackInput {
  reviewId: string;
  shareToken?: string;
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
  title?: string | null;
  client_name?: string | null;
  instructions?: string | null;
  review_goal?: 'feedback_only' | 'select_version' | 'approve_final' | 'approve' | null;
  client_visible?: boolean | null;
  brief_message?: string | null;
  brief_focus_points?: string[] | null;
  brief_requested_outcome?: string | null;
  brief_updated_at?: string | null;
  reviewer_name_required?: boolean | null;
  pin_protection_enabled?: boolean | null;
  allow_comments?: boolean | null;
  allow_decisions?: boolean | null;
  content: ReviewData | null;
}

function isMissingBriefColumnError(error: { message?: string | null; code?: string | null } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? '';
  return message.includes('brief_message') || message.includes('brief_focus_points') || message.includes('brief_requested_outcome') || message.includes('brief_updated_at');
}

function reviewUpsertPayload(review: ReviewData, ownerId: string, includeBriefColumns: boolean, extra: Record<string, unknown> = {}) {
  return {
    id: review.id,
    owner_id: ownerId,
    title: review.title,
    client_name: review.client,
    instructions: review.instructions,
    review_goal: review.reviewGoal,
    client_visible: review.clientVisible,
    ...(includeBriefColumns ? {
      brief_message: review.brief.message,
      brief_focus_points: review.brief.focusPoints,
      brief_requested_outcome: review.brief.requestedOutcome,
      brief_updated_at: review.brief.updatedAt,
    } : {}),
    status: getReviewStatus(review),
    reviewer_name_required: review.shareSettings.reviewerNameRequired,
    pin_protection_enabled: review.shareSettings.pinProtection,
    allow_comments: review.shareSettings.allowComments,
    allow_decisions: review.shareSettings.allowDecisions,
    content: { ...review, shareToken: undefined },
    updated_at: new Date().toISOString(),
    ...extra,
  };
}

interface AssetRow {
  id: string;
  review_id: string;
  type: string | null;
  title: string | null;
  description: string | null;
  sort_order: number | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface AssetVersionRow {
  id: string;
  review_id: string;
  asset_id: string;
  label: string | null;
  version_number: number | null;
  sort_order: number | null;
  source_url: string | null;
  preview_url: string | null;
  thumbnail_url: string | null;
  storage_path: string | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  page_count: number | null;
  preview_bytes: number | null;
  processing_status: AssetVersion['status'] | null;
  status: AssetVersion['status'] | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
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
  asset_id?: string | null;
  option_id?: string | null;
  reviewer_name?: string | null;
  created_at?: string | null;
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
    reviewGoal: 'approve_final',
    clientVisible: false,
    brief: {
      message: '',
      focusPoints: [],
      requestedOutcome: '',
      updatedAt: null,
    },
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
        title: 'Primary deliverable',
        description: '',
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
  const outcomes = Object.values(review.decisionOutcomes ?? {});
  if (outcomes.some((outcome) => outcome.type === 'changes_requested')) return 'changes_requested';
  if (review.reviewGoal === 'approve_final' && review.assets.length > 0 && review.assets.every((asset) => review.decisionOutcomes?.[asset.id]?.type === 'approved')) return 'approved';
  if (review.reviewGoal === 'select_version' && review.assets.length > 0 && review.assets.every((asset) => review.decisionOutcomes?.[asset.id]?.type === 'direction_selected')) return 'completed';
  if (review.reviewGoal === 'feedback_only' && review.assets.length > 0 && review.assets.every((asset) => review.decisionOutcomes?.[asset.id]?.type === 'reviewed')) return 'completed';
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

function appAssetType(assetType?: string | null): ReviewAsset['assetType'] {
  if (assetType === 'image' || assetType === 'screenshot' || assetType === 'pdf') return assetType;
  return 'screenshot';
}

function readStringMetadata(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : undefined;
}

function readNumberMetadata(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === 'number' ? value : undefined;
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
    asset_type: dbAssetType(asset.assetType),
    status: asset.status ?? 'in_review',
    metadata: {
      accent: asset.accent,
      notes: asset.notes,
      instructions: asset.instructions ?? null,
    },
    processing_status: 'ready',
    sort_order: sortOrder,
    updated_at: new Date().toISOString(),
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
        ...(version.metadata ?? {}),
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

  const pdfPageRows = review.assets.flatMap((asset) => asset.versions.flatMap((version) => {
    const pages = version.metadata?.pdfPages;
    if (!Array.isArray(pages)) return [];
    return pages.flatMap((page) => {
      if (!page || typeof page !== 'object') return [];
      const candidate = page as Record<string, unknown>;
      const pageNumber = Number(candidate.pageNumber);
      if (!Number.isInteger(pageNumber) || pageNumber < 1) return [];
      return [{
        id: `${version.id}-page-${pageNumber}`,
        asset_version_id: version.id,
        page_number: pageNumber,
        preview_storage_path: typeof candidate.storagePath === 'string' ? candidate.storagePath : null,
        thumbnail_storage_path: typeof candidate.thumbnailStoragePath === 'string' ? candidate.thumbnailStoragePath : null,
        width: typeof candidate.width === 'number' ? candidate.width : null,
        height: typeof candidate.height === 'number' ? candidate.height : null,
        processing_status: typeof candidate.status === 'string' ? candidate.status : 'ready',
      }];
    });
  }));

  if (pdfPageRows.length > 0) {
    const { error } = await client.from('asset_version_pages').upsert(pdfPageRows);
    if (error) {
      console.warn('Failed to sync PDF page rows to Supabase:', error.message);
    }
  }
}

function mapStructuredAssets(baseReview: ReviewData, assetRows: AssetRow[], versionRows: AssetVersionRow[]) {
  if (assetRows.length === 0) return baseReview.assets;

  return [...assetRows]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((assetRow, assetIndex) => {
      const snapshotAsset = baseReview.assets.find((asset) => asset.id === assetRow.id);
      const versions = versionRows
        .filter((version) => version.asset_id === assetRow.id)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((versionRow, versionIndex) => {
          const snapshotVersion = snapshotAsset?.versions.find((version) => version.id === versionRow.id);
          const metadata = versionRow.metadata ?? {};

          return {
            ...snapshotVersion,
            id: versionRow.id,
            assetId: versionRow.asset_id,
            reviewId: versionRow.review_id,
            label: versionRow.label ?? snapshotVersion?.label ?? versionLabel(versionIndex),
            versionNumber: versionRow.version_number ?? snapshotVersion?.versionNumber ?? versionIndex + 1,
            sortOrder: versionRow.sort_order ?? snapshotVersion?.sortOrder ?? versionIndex,
            sourceUrl: versionRow.source_url ?? snapshotVersion?.sourceUrl,
            originalName: readStringMetadata(metadata, 'originalName') ?? snapshotVersion?.originalName,
            originalMimeType: readStringMetadata(metadata, 'originalMimeType') ?? snapshotVersion?.originalMimeType,
            originalBytes: readNumberMetadata(metadata, 'originalBytes') ?? snapshotVersion?.originalBytes,
            previewUrl: versionRow.preview_url ?? snapshotVersion?.previewUrl,
            thumbnailUrl: versionRow.thumbnail_url ?? snapshotVersion?.thumbnailUrl,
            previewMimeType: (readStringMetadata(metadata, 'previewMimeType') as AssetVersion['previewMimeType']) ?? snapshotVersion?.previewMimeType,
            previewBytes: versionRow.preview_bytes ?? snapshotVersion?.previewBytes,
            storagePath: versionRow.storage_path ?? snapshotVersion?.storagePath,
            thumbnailStoragePath: readStringMetadata(metadata, 'thumbnailStoragePath') ?? snapshotVersion?.thumbnailStoragePath,
            mimeType: versionRow.mime_type ?? snapshotVersion?.mimeType,
            width: versionRow.width ?? snapshotVersion?.width,
            height: versionRow.height ?? snapshotVersion?.height,
            pageNumber: readNumberMetadata(metadata, 'pageNumber') ?? snapshotVersion?.pageNumber,
            pageCount: versionRow.page_count ?? snapshotVersion?.pageCount,
            status: versionRow.processing_status ?? versionRow.status ?? snapshotVersion?.status ?? 'idle',
            storageHint: readStringMetadata(metadata, 'storageHint') ?? snapshotVersion?.storageHint,
            metadata,
            createdAt: versionRow.created_at ?? snapshotVersion?.createdAt,
            updatedAt: versionRow.updated_at ?? snapshotVersion?.updatedAt,
          };
        });

      return {
        ...snapshotAsset,
        id: assetRow.id,
        reviewId: assetRow.review_id,
        title: assetRow.title ?? snapshotAsset?.title ?? 'Review deliverable',
        description: assetRow.description ?? snapshotAsset?.description ?? '',
        instructions: readStringMetadata(assetRow.metadata, 'instructions') ?? snapshotAsset?.instructions,
        assetType: appAssetType(assetRow.type),
        sortOrder: assetRow.sort_order ?? snapshotAsset?.sortOrder ?? assetIndex,
        status: (assetRow.status as ReviewAsset['status']) ?? snapshotAsset?.status ?? 'in_review',
        accent: readStringMetadata(assetRow.metadata, 'accent') ?? snapshotAsset?.accent ?? 'from-stone-700 via-stone-500 to-stone-200',
        notes: readStringMetadata(assetRow.metadata, 'notes') ?? snapshotAsset?.notes ?? 'Ready for review.',
        versions: versions.length > 0 ? versions : snapshotAsset?.versions ?? [],
        metadata: assetRow.metadata ?? snapshotAsset?.metadata,
        createdAt: assetRow.created_at ?? snapshotAsset?.createdAt,
        updatedAt: assetRow.updated_at ?? snapshotAsset?.updatedAt,
      };
    });
}

async function loadStructuredRows(reviewId: string) {
  const client = createSupabaseClientInstance();
  if (!client) return { assetRows: [] as AssetRow[], versionRows: [] as AssetVersionRow[] };

  const [assetsResult, versionsResult] = await Promise.all([
    client
      .from(ASSET_TABLE)
      .select('id, review_id, type, title, description, sort_order, status, metadata, created_at, updated_at')
      .eq('review_id', reviewId)
      .order('sort_order', { ascending: true }),
    client
      .from(ASSET_VERSION_TABLE)
      .select('id, review_id, asset_id, label, version_number, sort_order, source_url, preview_url, thumbnail_url, storage_path, mime_type, width, height, page_count, preview_bytes, processing_status, status, metadata, created_at, updated_at')
      .eq('review_id', reviewId)
      .order('sort_order', { ascending: true }),
  ]);

  if (assetsResult.error) {
    console.warn('Failed to load structured assets; falling back to review snapshot:', assetsResult.error.message);
  }

  if (versionsResult.error) {
    console.warn('Failed to load structured asset versions; falling back to review snapshot versions:', versionsResult.error.message);
  }

  return {
    assetRows: (assetsResult.data ?? []) as AssetRow[],
    versionRows: (versionsResult.data ?? []) as AssetVersionRow[],
  };
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
  const review = normalizeReviewData({
    ...(row.content ?? createEmptyReviewData(row.id)),
    id: row.id,
    title: row.title ?? row.content?.title,
    client: row.client_name ?? row.content?.client,
    instructions: row.instructions ?? row.content?.instructions,
    reviewGoal: row.review_goal === 'feedback_only' || row.review_goal === 'select_version' || row.review_goal === 'approve_final' ? row.review_goal : row.content?.reviewGoal,
    clientVisible: row.client_visible ?? row.content?.clientVisible ?? false,
    brief: {
      message: row.brief_message ?? row.content?.brief?.message ?? '',
      focusPoints: row.brief_focus_points ?? row.content?.brief?.focusPoints ?? [],
      requestedOutcome: row.brief_requested_outcome ?? row.content?.brief?.requestedOutcome ?? '',
      updatedAt: row.brief_updated_at ?? row.content?.brief?.updatedAt ?? null,
    },
    shareSettings: {
      reviewerNameRequired: row.reviewer_name_required ?? row.content?.shareSettings?.reviewerNameRequired ?? true,
      pinProtection: row.pin_protection_enabled ?? row.content?.shareSettings?.pinProtection ?? false,
      allowComments: row.allow_comments ?? row.content?.shareSettings?.allowComments ?? true,
      allowDecisions: row.allow_decisions ?? row.content?.shareSettings?.allowDecisions ?? true,
    },
  } as ReviewData);
  const reviewWithMetadata = {
    ...review,
    id: row.id,
    shareToken: row.share_token ?? review.shareToken,
  };

  const client = createSupabaseClientInstance();
  if (!client) return reviewWithMetadata;

  const [{ assetRows, versionRows }, commentRows] = await Promise.all([
    loadStructuredRows(row.id),
    loadCommentRows(row.id),
  ]);
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
    .select('type, note, asset_id, asset_version_id, option_id, reviewer_name, created_at')
    .eq('review_id', row.id)
    .order('created_at', { ascending: false })
    .limit(500);

  let decisionRows = (richDecisionRows ?? []) as DecisionRow[];
  if (richDecisionError) {
    console.warn('Falling back to legacy decision query:', richDecisionError.message);
    const { data: legacyDecisionRows, error: legacyDecisionError } = await client
      .from(DECISION_TABLE)
      .select('type, note, option_id, reviewer_name, created_at')
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
  const decisionOutcomes = decisionRows.reduce<Record<string, DecisionOutcome>>((outcomes, decision) => {
    const assetId = decision.asset_id;
    if (assetId && decision.type && !outcomes[assetId]) outcomes[assetId] = { type: decision.type, note: decision.note ?? '', assetVersionId: decision.asset_version_id ?? decision.option_id ?? null, reviewerName: decision.reviewer_name ?? null, createdAt: decision.created_at ?? null };
    return outcomes;
  }, {});

  const creatorReview = {
    ...reviewWithMetadata,
    assets: mapStructuredAssets(reviewWithMetadata, assetRows, versionRows),
    comments: mergeComments(reviewWithMetadata.comments, tableComments),
    overallFeedback: feedbackRows?.[0]?.body ?? reviewWithMetadata.overallFeedback,
    decision: latestDecision?.note ?? reviewWithMetadata.decision,
    decisionOutcome: latestDecision?.type ? {
      type: latestDecision.type,
      note: latestDecision.note ?? '',
      assetVersionId: latestDecision.asset_version_id ?? latestDecision.option_id ?? null,
      reviewerName: latestDecision.reviewer_name ?? null,
      createdAt: latestDecision.created_at ?? null,
    } satisfies DecisionOutcome : reviewWithMetadata.decisionOutcome ?? null,
    decisionOutcomes,
    selectedDirection: latestDecision?.asset_version_id ?? latestDecision?.option_id ?? reviewWithMetadata.selectedDirection,
    selectedAssetVersionId: latestDecision?.asset_version_id ?? latestDecision?.option_id ?? reviewWithMetadata.selectedAssetVersionId,
  };

  if (row.share_token) {
    const sharedReview = await loadSharedReviewPayload(client, row.share_token);

    if (sharedReview) {
      return {
        ...creatorReview,
        assets: sharedReview.assets,
        comments: sharedReview.comments,
        overallFeedback: sharedReview.overallFeedback,
        decision: sharedReview.decision,
        selectedDirection: sharedReview.selectedDirection,
        selectedAssetVersionId: sharedReview.selectedAssetVersionId,
      };
    }
  }

  return creatorReview;
}

function normalizeSharedReviewPayload(payload: unknown, shareToken: string): ReviewData | null {
  if (!payload || typeof payload !== 'object') return null;
  return normalizeReviewData({ ...(payload as ReviewData), shareToken });
}

async function loadSharedReviewPayload(client: NonNullable<ReturnType<typeof createSupabaseClientInstance>>, shareToken: string) {
  const [{ data, error }, contextResult] = await Promise.all([
    client.rpc('get_shared_review_secure', { p_share_token: shareToken, p_access_code: null }),
    client.rpc('get_shared_review_decision_context', { p_share_token: shareToken }),
  ]);

  if (error) {
    console.error('Failed to load shared review from Supabase:', error.message);
    return null;
  }

  const context = contextResult.error || !contextResult.data || typeof contextResult.data !== 'object'
    ? {}
    : contextResult.data as Record<string, unknown>;
  return normalizeSharedReviewPayload({ ...(data as Record<string, unknown>), ...context }, shareToken);
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

  const reviewResult = await client
    .from(REVIEW_TABLE)
    .select(REVIEW_SELECT_WITH_BRIEF)
    .eq('id', reviewId)
    .eq('owner_id', userData.user.id)
    .maybeSingle();
  let data = reviewResult.data as ReviewRow | null;
  let error = reviewResult.error;

  if (error && isMissingBriefColumnError(error)) {
    const legacyResult = await client
      .from(REVIEW_TABLE)
      .select(REVIEW_SELECT_LEGACY)
      .eq('id', reviewId)
      .eq('owner_id', userData.user.id)
      .maybeSingle();

    data = legacyResult.data as ReviewRow | null;
    error = legacyResult.error;
  }

  if (error) {
    console.error('Failed to load review from Supabase:', error.message);
    return createEmptyReviewData(reviewId);
  }

  if (data) {
    return hydrateReviewFromRow(data as ReviewRow);
  }

  const emptyReview = createEmptyReviewData(reviewId);
  let { error: insertError } = await client.from(REVIEW_TABLE).upsert(reviewUpsertPayload(emptyReview, userData.user.id, true, { status: 'in_review' }));

  if (insertError && isMissingBriefColumnError(insertError)) {
    const legacyInsert = await client.from(REVIEW_TABLE).upsert(reviewUpsertPayload(emptyReview, userData.user.id, false, { status: 'in_review' }));
    insertError = legacyInsert.error;
  }

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

  const sharedReview = await loadSharedReviewPayload(client, shareToken);

  if (!sharedReview) {
    return {
      ...createEmptyReviewData('shared-review-unavailable'),
      shareToken,
      title: 'Review link unavailable',
      instructions: 'This shared review is not available. It may still be a draft, archived, or the link may be incorrect.',
      assets: [],
    };
  }

  return sharedReview;
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
    .select('id, project_id, share_token, title, client_name, status, updated_at, creator_seen_at, content')
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
      projectId: row.project_id ?? null,
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

export async function createReview(title?: string, projectId?: string | null, reviewGoal: ReviewGoal = 'approve_final'): Promise<ReviewData> {
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
  review.title = title?.trim() || review.title;
  review.reviewGoal = reviewGoal;
  // A review created from a Project is intended for that project's client-facing flow.
  // Creators can still turn this off from Review settings before sharing.
  review.clientVisible = Boolean(projectId);
  const now = new Date().toISOString();

  let { data, error } = await client.from(REVIEW_TABLE).insert(reviewUpsertPayload(review, userData.user.id, true, {
    project_id: projectId ?? null,
    status: 'in_review',
    lifecycle: 'open',
    creator_seen_at: now,
    updated_at: now,
  })).select('share_token').single();

  if (error && isMissingBriefColumnError(error)) {
    const legacyInsert = await client.from(REVIEW_TABLE).insert(reviewUpsertPayload(review, userData.user.id, false, {
      project_id: projectId ?? null,
      status: 'in_review',
      lifecycle: 'open',
      creator_seen_at: now,
      updated_at: now,
    })).select('share_token').single();

    data = legacyInsert.data;
    error = legacyInsert.error;
  }

  if (error) {
    throw new Error(`Failed to create review: ${error.message}`);
  }

  const reviewWithToken = { ...review, shareToken: data?.share_token ?? review.shareToken };
  await syncReviewRows(reviewWithToken);
  return reviewWithToken;
}

export async function listProjects(): Promise<ProjectSummary[]> {
  if (!isSupabaseConfigured()) return [];
  const client = createSupabaseClientInstance();
  if (!client) return [];
  const { data: userData } = await client.auth.getUser();
  if (!userData.user) return [];
  const [{ data, error }, reviews] = await Promise.all([
    client.from('projects').select('id, name, client_name, description, status, share_token').eq('owner_id', userData.user.id).order('updated_at', { ascending: false }),
    listReviews(),
  ]);
  if (error) throw new Error(`Failed to load projects: ${error.message}`);
  return (data ?? []).map((project) => ({ id: project.id, name: project.name, client: project.client_name ?? '', description: project.description ?? '', status: project.status ?? 'active', shareToken: project.share_token ?? undefined, reviews: reviews.filter((review) => review.projectId === project.id) }));
}

export async function createProject(input: { name: string; client?: string; description?: string }): Promise<ProjectSummary> {
  const client = createSupabaseClientInstance();
  if (!client) throw new Error('Connect Supabase before creating projects.');
  const { data: userData } = await client.auth.getUser();
  if (!userData.user) throw new Error('Sign in to create a project.');
  const { data, error } = await client.from('projects').insert({ owner_id: userData.user.id, name: input.name.trim() || 'Untitled project', client_name: input.client?.trim() || null, description: input.description?.trim() || '' }).select('id, name, client_name, description, status, share_token').single();
  if (error || !data) throw new Error(`Failed to create project: ${error?.message ?? 'Unknown error'}`);
  return { id: data.id, name: data.name, client: data.client_name ?? '', description: data.description ?? '', status: data.status ?? 'active', shareToken: data.share_token ?? undefined, reviews: [] };
}

const PROJECT_SHARE_TOKEN_PATTERN = /^[a-f0-9]{48}$/i;

function generateProjectShareToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Re-read the token before sharing and repair incomplete legacy values only. */
export async function getProjectShareToken(projectId: string): Promise<string> {
  const client = createSupabaseClientInstance();
  if (!client) throw new Error('Connect Supabase before sharing a project.');
  const { data: project, error: readError } = await client.from('projects').select('share_token').eq('id', projectId).single();
  if (readError || !project) throw new Error(`Could not prepare the project link: ${readError?.message ?? 'Project not found'}`);
  if (typeof project.share_token === 'string' && PROJECT_SHARE_TOKEN_PATTERN.test(project.share_token)) return project.share_token;

  const shareToken = generateProjectShareToken();
  const { error: updateError } = await client.from('projects').update({ share_token: shareToken, sharing_enabled: true, updated_at: new Date().toISOString() }).eq('id', projectId);
  if (updateError) throw new Error(`Could not repair the project link: ${updateError.message}`);
  return shareToken;
}

function createInvitationToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Creates a hashed invitation record, then asks Supabase Auth to send its magic link. */
export async function inviteProjectClient(projectId: string, email: string): Promise<void> {
  const client = createSupabaseClientInstance();
  if (!client) throw new Error('Connect Supabase before inviting a client.');
  const token = createInvitationToken();
  const { error: invitationError } = await client.rpc('create_project_client_invitation', { p_project_id: projectId, p_email: email.trim(), p_raw_token: token });
  if (invitationError) throw new Error(invitationError.message);
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(`/client/invitations/${token}`)}`;
  const { error: emailError } = await client.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo, shouldCreateUser: true } });
  if (emailError) throw new Error(`Invitation created, but the email could not be sent: ${emailError.message}`);
}

export interface ProjectClientAccessRecord {
  id: string;
  email: string;
  status: 'pending' | 'active';
  displayName?: string | null;
  createdAt: string;
}

export async function loadProjectClientAccess(projectId: string): Promise<ProjectClientAccessRecord[]> {
  const client = createSupabaseClientInstance();
  if (!client) throw new Error('Connect Supabase before viewing client access.');
  const [{ data: memberships, error: membershipError }, { data: invitations, error: invitationError }] = await Promise.all([
    client.from('project_client_memberships').select('id, user_id, invited_email, accepted_at, created_at').eq('project_id', projectId).eq('status', 'active').order('accepted_at', { ascending: false }),
    client.from('project_client_invitations').select('id, email_normalized, created_at').eq('project_id', projectId).eq('status', 'pending').order('created_at', { ascending: false }),
  ]);
  if (membershipError) throw new Error(membershipError.message);
  if (invitationError) throw new Error(invitationError.message);

  const userIds = (memberships ?? []).map((membership) => membership.user_id);
  const { data: profiles, error: profileError } = userIds.length
    ? await client.from('profiles').select('user_id, display_name').in('user_id', userIds)
    : { data: [], error: null };
  if (profileError) throw new Error(profileError.message);
  const names = new Map((profiles ?? []).map((profile) => [profile.user_id, profile.display_name]));

  return [
    ...(memberships ?? []).map((membership) => ({ id: membership.id, email: membership.invited_email ?? 'Client account', status: 'active' as const, displayName: names.get(membership.user_id) ?? null, createdAt: membership.accepted_at ?? membership.created_at })),
    ...(invitations ?? []).map((invitation) => ({ id: invitation.id, email: invitation.email_normalized, status: 'pending' as const, createdAt: invitation.created_at })),
  ];
}

export async function revokeProjectClientAccess(input: { id: string; status: 'pending' | 'active' }): Promise<void> {
  const client = createSupabaseClientInstance();
  if (!client) throw new Error('Connect Supabase before changing client access.');
  const rpc = input.status === 'active' ? 'revoke_project_client_membership' : 'revoke_project_client_invitation';
  const parameter = input.status === 'active' ? { p_membership_id: input.id } : { p_invitation_id: input.id };
  const { error } = await client.rpc(rpc, parameter);
  if (error) throw new Error(error.message);
}

export async function getActiveWorkUsage(): Promise<ActiveWorkUsage | null> {
  if (!isSupabaseConfigured()) return null;
  const client = createSupabaseClientInstance();
  if (!client) return null;
  const { data, error } = await client.rpc('get_active_work_usage');
  if (error) throw new Error(`Failed to load active-work usage: ${error.message}`);
  if (!data || typeof data !== 'object') return null;
  const usage = data as Partial<ActiveWorkUsage>;
  return {
    activeProjects: Number(usage.activeProjects ?? 0),
    activeStandaloneReviews: Number(usage.activeStandaloneReviews ?? 0),
    totalActiveUnits: Number(usage.totalActiveUnits ?? 0),
    limit: typeof usage.limit === 'number' ? usage.limit : null,
    overLimit: Boolean(usage.overLimit),
  };
}

export async function listProjectRequests(): Promise<ProjectRequestSummary[]> {
  if (!isSupabaseConfigured()) return [];
  const client = createSupabaseClientInstance();
  if (!client) return [];
  const { data: userData } = await client.auth.getUser();
  if (!userData.user) return [];
  const { data, error } = await client
    .from('project_requests')
    .select('id, project_id, title, brief, status, requested_by_name, linked_review_id, updated_at')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(`Failed to load project requests: ${error.message}`);
  return (data ?? []).map((request) => ({
    id: request.id,
    projectId: request.project_id,
    title: request.title,
    brief: request.brief,
    status: request.status as ProjectRequestStatus,
    requestedByName: request.requested_by_name,
    linkedReviewId: request.linked_review_id ?? null,
    updatedAt: request.updated_at,
  }));
}

export async function updateProjectRequestStatus(requestId: string, status: ProjectRequestStatus): Promise<void> {
  const client = createSupabaseClientInstance();
  if (!client) throw new Error('Connect Supabase before updating a request.');
  const { error } = await client
    .from('project_requests')
    .update({ status, closed_at: ['closed', 'declined'].includes(status) ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
    .eq('id', requestId);
  if (error) throw new Error(`Failed to update request: ${error.message}`);
}

export async function linkProjectRequestToReview(requestId: string, reviewId: string | null): Promise<void> {
  const client = createSupabaseClientInstance();
  if (!client) throw new Error('Connect Supabase before linking a request.');
  const { error } = await client
    .from('project_requests')
    .update({ linked_review_id: reviewId, updated_at: new Date().toISOString() })
    .eq('id', requestId);
  if (error) throw new Error(`Failed to link request: ${error.message}`);
}

export async function loadCreatorProjectRequest(requestId: string): Promise<CreatorProjectRequestDetail | null> {
  const client = createSupabaseClientInstance();
  if (!client) return null;
  const [{ data: request, error }, { data: references }, { data: messages }] = await Promise.all([
    client.from('project_requests').select('id, project_id, title, brief, status, requested_by_name, linked_review_id, updated_at').eq('id', requestId).single(),
    client.from('project_request_references').select('id, reference_type, title, url, note, created_by_role, created_by_name').eq('request_id', requestId).order('sort_order'),
    client.from('project_request_messages').select('id, author_role, author_name, body, created_at').eq('request_id', requestId).order('created_at'),
  ]);
  if (error || !request) return null;
  return {
    id: request.id, projectId: request.project_id, title: request.title, brief: request.brief, status: request.status as ProjectRequestStatus, requestedByName: request.requested_by_name, linkedReviewId: request.linked_review_id ?? null, updatedAt: request.updated_at,
    references: (references ?? []).map((item) => ({ id: item.id, type: item.reference_type, title: item.title ?? null, url: item.url ?? null, note: item.note ?? null, createdByRole: item.created_by_role as 'client' | 'creator', createdByName: item.created_by_name ?? null })),
    messages: (messages ?? []).map((item) => ({ id: item.id, authorRole: item.author_role as 'client' | 'creator', authorName: item.author_name, body: item.body, createdAt: item.created_at })),
  };
}

export async function addCreatorProjectRequestMessage(input: { requestId: string; authorName: string; body: string }): Promise<void> {
  const client = createSupabaseClientInstance();
  if (!client) throw new Error('Connect Supabase before replying.');
  const { error } = await client.from('project_request_messages').insert({ id: newRequestId('creator-request-message'), request_id: input.requestId, author_role: 'creator', author_name: input.authorName.trim() || 'Creator', body: input.body.trim() });
  if (error) throw new Error(`Failed to send reply: ${error.message}`);
  const updateResult = await client.from('project_requests').update({ updated_at: new Date().toISOString() }).eq('id', input.requestId);
  if (updateResult.error) throw new Error(`Failed to update request: ${updateResult.error.message}`);
}

export async function loadSharedProject(shareToken: string, accessCode?: string): Promise<SharedProject | null> {
  const client = createSupabaseClientInstance();
  if (!client) return null;
  let { data, error } = await client.rpc('get_shared_project', { p_share_token: shareToken, p_access_code: accessCode ?? null });

  // Older deployments may still expose the original one-argument Project RPC
  // while PostgREST refreshes its function schema. It is safe only for an
  // unprotected Project: access-code requests must never fall back.
  if (error && !accessCode) {
    const legacyResult = await client.rpc('get_shared_project', { p_share_token: shareToken });
    data = legacyResult.data;
    error = legacyResult.error;
  }

  if (error || !data || typeof data !== 'object') return null;
  return data as SharedProject;
}

export async function setProjectAccessCode(projectId: string, accessCode: string): Promise<void> {
  const client = createSupabaseClientInstance();
  if (!client) throw new Error('Connect Supabase before changing project access.');
  const { error } = await client.rpc('set_project_access_code', { p_project_id: projectId, p_access_code: accessCode });
  if (error) throw new Error(error.message);
}

export async function updateProjectSharingSettings(projectId: string, settings: { sharingEnabled: boolean; allowClientRequests: boolean; allowClientRequestReplies: boolean; allowClientRequestReferences: boolean }): Promise<void> {
  const client = createSupabaseClientInstance();
  if (!client) throw new Error('Connect Supabase before changing project sharing.');
  const { error } = await client.from('projects').update({ sharing_enabled: settings.sharingEnabled, allow_client_requests: settings.allowClientRequests, allow_client_request_replies: settings.allowClientRequestReplies, allow_client_request_references: settings.allowClientRequestReferences, updated_at: new Date().toISOString() }).eq('id', projectId);
  if (error) throw new Error(error.message);
}

export async function setReviewLifecycle(reviewId: string, lifecycle: 'draft' | 'open' | 'closed' | 'archived'): Promise<void> {
  const client = createSupabaseClientInstance();
  if (!client) throw new Error('Connect Supabase before changing review lifecycle.');
  const { error } = await client.rpc('set_review_lifecycle', { p_review_id: reviewId, p_lifecycle: lifecycle });
  if (error) throw new Error(error.message);
}

export async function setProjectLifecycle(projectId: string, lifecycle: 'active' | 'completed' | 'archived'): Promise<void> {
  const client = createSupabaseClientInstance();
  if (!client) throw new Error('Connect Supabase before changing project lifecycle.');
  const { error } = await client.rpc('set_project_lifecycle', { p_project_id: projectId, p_status: lifecycle });
  if (error) throw new Error(error.message);
}

export async function setAssetVersionPublication(versionId: string, publication: 'draft' | 'published' | 'withdrawn'): Promise<void> {
  const client = createSupabaseClientInstance();
  if (!client) throw new Error('Connect Supabase before changing Version publication.');
  const { error } = await client.rpc('set_asset_version_publication', { p_version_id: versionId, p_publication: publication });
  if (error) throw new Error(error.message);
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

  let { error } = await client.from(REVIEW_TABLE).upsert(reviewUpsertPayload(review, userData.user.id, true));

  if (error && isMissingBriefColumnError(error)) {
    const legacySave = await client.from(REVIEW_TABLE).upsert(reviewUpsertPayload(review, userData.user.id, false));
    error = legacySave.error;
  }

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
    title: payload.title ?? 'Review deliverable',
    description: payload.description ?? '',
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

  if (review.shareToken && (comment.authorRole ?? 'reviewer') === 'reviewer') {
    await saveSharedReviewInteraction({ interaction: 'comment', shareToken: review.shareToken, reviewId: review.id, id: comment.id, assetId: comment.assetId, assetVersionId, parentCommentId: null, reviewerName: comment.author, body: comment.text, x: comment.x ?? null, y: comment.y ?? null, pageNumber: comment.pageNumber ?? null });
    return;
  }

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

  if (input.review.shareToken && input.authorRole === 'reviewer') {
    await saveSharedReviewInteraction({ interaction: 'comment', shareToken: input.review.shareToken, reviewId: input.review.id, id: reply.id, assetId: reply.assetId, assetVersionId: reply.assetVersionId ?? null, parentCommentId: input.parentCommentId, reviewerName: input.authorName, body: input.body, x: null, y: null, pageNumber: null });
    return reply;
  }

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

  if (input.shareToken) {
    await saveSharedReviewInteraction({ interaction: 'feedback', shareToken: input.shareToken, reviewId: input.reviewId, id: feedbackId, reviewerName: input.reviewerName, body: input.body });
    return;
  }

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
    asset_id: input.assetId,
    asset_version_id: input.assetVersionId ?? null,
    option_id: null,
    reviewer_name: input.reviewerName,
    type: input.type,
    note: input.note,
  };

  if (input.shareToken) {
    await saveSharedReviewInteraction({ interaction: 'decision', shareToken: input.shareToken, reviewId: input.reviewId, id: decisionId, assetId: input.assetId, assetVersionId: input.assetVersionId ?? null, reviewerName: input.reviewerName, type: input.type, note: input.note });
    return;
  }

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
