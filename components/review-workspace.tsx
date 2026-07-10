"use client";

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { FiClipboard, FiDownload, FiTrash2, FiUploadCloud } from 'react-icons/fi';
import type { User } from '@supabase/supabase-js';
import { AuthModal } from '@/components/auth/auth-modal';
import { AssetSurface } from '@/components/asset-surface';
import { BrandLogo } from '@/components/brand-logo';
import { FeedbackPanel } from '@/components/feedback-panel';
import { PinCommentLayer } from '@/components/pin-comment-layer';
import { estimateStorageSavings, processImagePreview, processPdfPreview } from '@/lib/asset-processing';
import type { AssetVersion, Comment, ReviewAsset, ReviewData, ShareSettings } from '@/lib/mock-data';
import {
  createEmptyReviewData,
  deleteAsset,
  deleteAssetVersion,
  getReviewShareToken,
  getOpenCommentCount,
  getResolvedCommentCount,
  loadReviewById,
  loadReviewByShareToken,
  markReviewSeen,
  reopenComment,
  resolveComment,
  saveComment,
  saveCommentReply,
  saveReview,
  saveReviewerDecision,
  saveReviewerFeedback,
  type ReviewerDecisionType,
} from '@/lib/review-service';
import { createSupabaseClientInstance, isSupabaseConfigured } from '@/lib/supabase';

export type ReviewWorkspaceMode = 'creator' | 'client';

interface ReviewWorkspaceProps {
  mode: ReviewWorkspaceMode;
  reviewId?: string;
  shareToken?: string;
  initialReview?: ReviewData;
}

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function versionLabel(index: number) {
  return `Version ${alphabet[index] ?? index + 1}`;
}

function formatByteSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function sanitizeDownloadName(value: string) {
  return value
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]+/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^-+|-+$/g, '') || 'wizerview-preview';
}

function getPreviewExtension(version?: AssetVersion) {
  if (version?.previewMimeType === 'image/png') return 'png';
  if (version?.previewMimeType === 'image/jpeg') return 'jpg';
  if (version?.previewMimeType === 'image/webp') return 'webp';
  return 'webp';
}

function getReviewSaveSignature(review: ReviewData) {
  return JSON.stringify({
    ...review,
    shareToken: undefined,
  });
}

function hasPendingAssetProcessing(review: ReviewData) {
  return review.assets.some((asset) =>
    asset.versions.some((version) => version.status === 'processing' || version.status === 'uploading')
  );
}

function collectObjectUrls(review: ReviewData) {
  return new Set(
    review.assets.flatMap((asset) =>
      asset.versions.flatMap((version) =>
        [version.previewUrl, version.thumbnailUrl].filter((url): url is string => Boolean(url?.startsWith('blob:')))
      )
    )
  );
}

export function ReviewWorkspace({ mode, reviewId, shareToken, initialReview }: ReviewWorkspaceProps) {
  const isCreator = mode === 'creator';
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createSupabaseClientInstance(), []);
  const fallbackReviewId = reviewId ?? `shared-${shareToken ?? 'review'}`;
  const fallbackReview = useMemo(() => initialReview ?? createEmptyReviewData(fallbackReviewId), [fallbackReviewId, initialReview]);

  const [review, setReview] = useState<ReviewData>(fallbackReview);
  const [activeAssetId, setActiveAssetId] = useState(fallbackReview.assets[0]?.id ?? '');
  const [activeVersionId, setActiveVersionId] = useState(fallbackReview.assets[0]?.versions[0]?.id ?? '');
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [activePdfPage, setActivePdfPage] = useState(1);
  const [rightTab, setRightTab] = useState<'notes' | 'feedback'>('notes');
  const [commentFilter, setCommentFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [showPins, setShowPins] = useState(true);
  const [isDropTargetActive, setIsDropTargetActive] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isReviewLoaded, setIsReviewLoaded] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(isCreator && Boolean(supabase));
  const [hasMarkedSeen, setHasMarkedSeen] = useState(false);
  const [reviewerName, setReviewerName] = useState('');
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [pendingComment, setPendingComment] = useState<{
    assetId: string;
    assetVersionId: string;
    x: number;
    y: number;
    text: string;
    author: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const savedReviewSignatureRef = useRef(getReviewSaveSignature(fallbackReview));
  const objectUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isCreator || !supabase) {
      setIsCheckingAuth(false);
      return;
    }

    let ignored = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!ignored) {
        setAuthUser(data.user ?? null);
        setIsCheckingAuth(false);
      }
    }).catch(() => {
      if (!ignored) setIsCheckingAuth(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
    });

    return () => {
      ignored = true;
      listener.subscription.unsubscribe();
    };
  }, [isCreator, supabase]);

  useEffect(() => {
    let ignored = false;

    const loader = shareToken ? loadReviewByShareToken(shareToken) : loadReviewById(fallbackReviewId);

    loader.then((loaded) => {
      if (ignored) return;
      const firstAsset = loaded.assets[0];
      const firstVersion = firstAsset?.versions[0];

      savedReviewSignatureRef.current = getReviewSaveSignature(loaded);
      setReview(loaded);
      setActiveAssetId(firstAsset?.id ?? '');
      setActiveVersionId(firstVersion?.id ?? '');
      setActiveCommentId(null);
      setIsReviewLoaded(true);
    });

    return () => {
      ignored = true;
    };
  }, [fallbackReviewId, shareToken]);

  useEffect(() => {
    const nextObjectUrls = collectObjectUrls(review);
    objectUrlsRef.current.forEach((url) => {
      if (!nextObjectUrls.has(url)) {
        URL.revokeObjectURL(url);
      }
    });
    objectUrlsRef.current = nextObjectUrls;
  }, [review]);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = new Set();
    };
  }, []);

  const activeAsset = review.assets.find((asset) => asset.id === activeAssetId) ?? review.assets[0];
  const activeVersion = activeAsset?.versions.find((version) => version.id === activeVersionId) ?? activeAsset?.versions[0];
  const activeVersionIndex = Math.max(0, activeAsset?.versions.findIndex((version) => version.id === activeVersion?.id) ?? 0);
  const assetComments = review.comments.filter((comment) => comment.assetId === activeAsset?.id && comment.assetVersionId === activeVersion?.id && !comment.parentCommentId);
  const filteredAssetComments = assetComments.filter((comment) => commentFilter === 'all' || (comment.status ?? 'open') === commentFilter);
  const openCommentCount = getOpenCommentCount(review.comments);
  const resolvedCommentCount = getResolvedCommentCount(review.comments);
  const totalComments = review.comments.filter((comment) => !comment.parentCommentId).length;
  const hasMultipleVersions = (activeAsset?.versions.length ?? 0) > 1;
  const shareSummary = useMemo(() => {
    const parts = [review.shareSettings.reviewerNameRequired ? 'name required' : 'name optional'];
    if (review.shareSettings.pinProtection) parts.push('PIN');
    if (review.shareSettings.allowComments) parts.push('comments');
    if (review.shareSettings.allowDecisions) parts.push('decisions');
    return parts.join(' / ');
  }, [review.shareSettings]);

  useEffect(() => {
    if (!activeAsset) return;
    if (!activeAsset.versions.some((version) => version.id === activeVersionId)) {
      setActiveVersionId(activeAsset.versions[0]?.id ?? '');
      setActiveCommentId(null);
    }
  }, [activeAsset, activeVersionId]);

  useEffect(() => {
    if (!isCreator || !isReviewLoaded) return;
    if (isCheckingAuth) return;
    if (isSupabaseConfigured() && !authUser) return;
    if (hasPendingAssetProcessing(review)) return;

    const saveSignature = getReviewSaveSignature(review);
    if (saveSignature === savedReviewSignatureRef.current) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      saveReview(review).then(() => {
        if (!cancelled) {
          savedReviewSignatureRef.current = saveSignature;
        }
      }).catch((error) => {
        if (cancelled) return;
        setSaveMessage(error instanceof Error ? error.message : 'Autosave failed.');
      });
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [authUser, isCheckingAuth, isCreator, isReviewLoaded, review]);

  useEffect(() => {
    if (!isCreator || !isReviewLoaded || !authUser || hasMarkedSeen) return;

    setHasMarkedSeen(true);
    markReviewSeen(review.id).catch((error) => {
      setSaveMessage(error instanceof Error ? error.message : 'Could not mark review as seen.');
    });
  }, [authUser, hasMarkedSeen, isCreator, isReviewLoaded, review.id]);

  const requireName = () => {
    if (isCreator) return true;
    if (!review.shareSettings.reviewerNameRequired) return true;
    if (!reviewerName.trim()) {
      setShowIdentityModal(true);
      return false;
    }
    return true;
  };

  const copyReviewLink = async () => {
    let token = review.shareToken ?? null;

    if (!token && isCreator) {
      token = await getReviewShareToken(review.id);
      if (token) {
        setReview((current) => ({ ...current, shareToken: token ?? undefined }));
      }
    }

    if (!token) {
      setSaveMessage('No share token is available for this review.');
      return;
    }

    const nextShareLink = typeof window !== 'undefined' ? `${window.location.origin}/review/${token}` : `/review/${token}`;

    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      setSaveMessage(nextShareLink);
      return;
    }

    await navigator.clipboard.writeText(nextShareLink);
    setSaveMessage('Review link copied.');
  };

  const downloadActivePreview = () => {
    if (!activeVersion?.previewUrl || typeof document === 'undefined') return;

    const link = document.createElement('a');
    const baseName = sanitizeDownloadName(activeVersion.originalName ?? `${activeAsset?.title ?? 'wizerview-preview'} ${activeVersion.label ?? ''}`);
    const hasExtension = /\.[a-z0-9]{2,5}$/i.test(baseName);

    link.href = activeVersion.previewUrl;
    link.download = hasExtension ? baseName : `${baseName}.${getPreviewExtension(activeVersion)}`;
    link.rel = 'noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const updateShareSetting = (key: keyof ShareSettings, value: boolean) => {
    setReview((current) => ({
      ...current,
      shareSettings: { ...current.shareSettings, [key]: value },
    }));
  };

  const handleSaveReview = async () => {
    if (isSupabaseConfigured() && !authUser) {
      setSaveMessage('Sign in to save reviews.');
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      await saveReview(review);
      savedReviewSignatureRef.current = getReviewSaveSignature(review);
      setSaveMessage('Saved.');
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Save failed.');
    } finally {
      setIsSaving(false);
    }
  };

  const openAuthModal = (authMode: 'login' | 'signup') => {
    const nextPath = pathname || '/dashboard';
    router.push(`${nextPath}?auth=${authMode}&next=${encodeURIComponent(nextPath)}`);
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setAuthUser(null);
    setSaveMessage(null);
  };

  const processAssetFile = async (file: File) => {
    if (!activeAsset || !activeVersion) return;
    if (isSupabaseConfigured() && !authUser) {
      setUploadMessage('Sign in before uploading optimized previews.');
      return;
    }

    const pendingVersion: AssetVersion = {
      ...activeVersion,
      status: 'processing',
      originalName: file.name,
      originalMimeType: file.type,
      originalBytes: file.size,
      storageHint: 'WizerView stores optimized review previews, not the original file.',
    };

    setReview((current) => ({
      ...current,
      assets: current.assets.map((asset) =>
        asset.id === activeAsset.id
          ? {
              ...asset,
              title: asset.title === 'Primary asset' ? file.name.replace(/\.[^.]+$/, '') : asset.title,
              assetType: file.type === 'application/pdf' ? 'pdf' : asset.assetType,
              versions: asset.versions.map((version) => (version.id === activeVersion.id ? pendingVersion : version)),
            }
          : asset
      ),
    }));
    setActivePdfPage(1);
    setUploadMessage(`Uploading ${file.name}...`);

    try {
      const processed = file.type === 'application/pdf' ? await processPdfPreview(file) : await processImagePreview(file);
      const nextVersion: AssetVersion = {
        ...pendingVersion,
        status: 'ready',
        originalName: processed.originalName,
        originalMimeType: processed.originalMimeType,
        originalBytes: processed.originalBytes,
        previewUrl: processed.previewUrl,
        thumbnailUrl: processed.thumbnailUrl,
        previewMimeType: processed.previewMimeType,
        previewBytes: processed.previewBytes,
        storagePath: processed.storagePath,
        thumbnailStoragePath: processed.thumbnailStoragePath,
        mimeType: processed.originalMimeType ?? processed.previewMimeType,
        width: processed.width,
        height: processed.height,
        pageCount: processed.pageCount,
        pageNumber: 1,
        storageHint: processed.storageHint,
      };

      setReview((current) => ({
        ...current,
        assets: current.assets.map((asset) =>
          asset.id === activeAsset.id
            ? {
                ...asset,
                title: asset.title === 'Primary asset' ? processed.originalName.replace(/\.[^.]+$/, '') : asset.title,
                description: processed.storageHint,
                notes: `${processed.previewMimeType.toUpperCase()} preview / ${formatByteSize(processed.previewBytes)} / ${estimateStorageSavings(processed.originalBytes, processed.previewBytes)}% smaller`,
                assetType: processed.kind === 'pdf' ? 'pdf' : 'screenshot',
                versions: asset.versions.map((version) => (version.id === activeVersion.id ? nextVersion : version)),
              }
            : asset
        ),
      }));
      setUploadMessage(`Original ${formatByteSize(processed.originalBytes)} -> Preview ${formatByteSize(processed.previewBytes)} ${processed.previewMimeType.toUpperCase()}`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Processing failed.';
      setReview((current) => ({
        ...current,
        assets: current.assets.map((asset) =>
          asset.id === activeAsset.id
            ? {
                ...asset,
                notes: reason,
                versions: asset.versions.map((version) => (version.id === activeVersion.id ? { ...version, status: 'failed', storageHint: 'Processing failed.' } : version)),
              }
            : asset
        ),
      }));
      setUploadMessage(reason);
    }
  };

  const handleAssetUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processAssetFile(file);
    event.target.value = '';
  };

  const handleDropFile = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDropTargetActive(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await processAssetFile(file);
  };

  const handlePasteFromClipboard = async () => {
    if (typeof navigator === 'undefined') return;
    const clipboard = navigator.clipboard as Clipboard & { read?: () => Promise<ClipboardItem[]> };

    if (!clipboard?.read) {
      setUploadMessage('Clipboard image paste is not available in this browser.');
      return;
    }

    try {
      const items = await clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((type) => type.startsWith('image/'));
        if (!imageType) continue;
        const blob = await item.getType(imageType);
        const extension = imageType.split('/')[1] || 'png';
        await processAssetFile(new File([blob], `clipboard-${Date.now()}.${extension}`, { type: imageType }));
        return;
      }
      setUploadMessage('No image found on the clipboard.');
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : 'Could not paste from clipboard.');
    }
  };

  const addVersion = () => {
    if (!activeAsset) return;
    const nextIndex = activeAsset.versions.length;
    const newVersion: AssetVersion = {
      id: `${activeAsset.id}-version-${Date.now()}`,
      assetId: activeAsset.id,
      reviewId: review.id,
      label: versionLabel(nextIndex),
      versionNumber: nextIndex + 1,
      sortOrder: nextIndex,
      status: 'idle',
    };

    setReview((current) => ({
      ...current,
      assets: current.assets.map((asset) => (asset.id === activeAsset.id ? { ...asset, versions: [...asset.versions, newVersion] } : asset)),
    }));
    setActiveVersionId(newVersion.id);
    setActiveCommentId(null);
  };

  const addRelatedAsset = () => {
    const newAssetId = `asset-${Date.now()}`;
    const newVersionId = `${newAssetId}-version-a`;
    const newAsset: ReviewAsset = {
      id: `asset-${Date.now()}`,
      reviewId: review.id,
      title: 'Related asset',
      assetType: 'screenshot',
      description: 'A new reviewable asset.',
      sortOrder: review.assets.length,
      status: 'in_review',
      accent: 'from-stone-700 via-stone-500 to-stone-200',
      notes: 'Ready for review.',
      versions: [
        {
          id: newVersionId,
          assetId: newAssetId,
          reviewId: review.id,
          label: 'Version A',
          versionNumber: 1,
          sortOrder: 0,
          status: 'idle',
        },
      ],
    };

    setReview((current) => ({
      ...current,
      assets: [...current.assets, { ...newAsset, id: newAssetId }],
    }));
    setActiveAssetId(newAssetId);
    setActiveVersionId(newVersionId);
    setActiveCommentId(null);
  };

  const handleDeleteAsset = async (targetAsset = activeAsset) => {
    if (!isCreator || !targetAsset) return;

    const confirmed = window.confirm(`Delete "${targetAsset.title}" and all of its versions and comments?`);
    if (!confirmed) return;

    const deletedAssetId = targetAsset.id;
    const remainingAssets = review.assets.filter((asset) => asset.id !== deletedAssetId);
    const nextAsset = remainingAssets[0];

    try {
      await deleteAsset(review, deletedAssetId);
      setReview((current) => ({
        ...current,
        assets: current.assets.filter((asset) => asset.id !== deletedAssetId),
        comments: current.comments.filter((comment) => comment.assetId !== deletedAssetId),
        selectedAssetVersionId: current.selectedAssetVersionId && current.assets.find((asset) => asset.id === deletedAssetId)?.versions.some((version) => version.id === current.selectedAssetVersionId) ? null : current.selectedAssetVersionId,
        selectedDirection: current.selectedDirection && current.assets.find((asset) => asset.id === deletedAssetId)?.versions.some((version) => version.id === current.selectedDirection) ? null : current.selectedDirection,
      }));
      setActiveAssetId(nextAsset?.id ?? '');
      setActiveVersionId(nextAsset?.versions[0]?.id ?? '');
      setActiveCommentId(null);
      setSaveMessage('Asset deleted.');
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Could not delete asset.');
    }
  };

  const handleDeleteVersion = async () => {
    if (!isCreator || !activeAsset || !activeVersion) return;

    const confirmed = window.confirm(`Delete "${activeVersion.label}" for "${activeAsset.title}" and its comments?`);
    if (!confirmed) return;

    const deletedVersionId = activeVersion.id;
    const remainingVersions = activeAsset.versions.filter((version) => version.id !== deletedVersionId);
    const nextVersion = remainingVersions[0];

    try {
      await deleteAssetVersion(review, deletedVersionId);
      setReview((current) => ({
        ...current,
        assets: current.assets.map((asset) =>
          asset.id === activeAsset.id
            ? { ...asset, versions: asset.versions.filter((version) => version.id !== deletedVersionId) }
            : asset
        ),
        comments: current.comments.filter((comment) => comment.assetVersionId !== deletedVersionId),
        selectedAssetVersionId: current.selectedAssetVersionId === deletedVersionId ? null : current.selectedAssetVersionId,
        selectedDirection: current.selectedDirection === deletedVersionId ? null : current.selectedDirection,
      }));
      setActiveVersionId(nextVersion?.id ?? '');
      setActiveCommentId(null);
      setSaveMessage('Version deleted.');
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Could not delete version.');
    }
  };

  const addReplyToState = (parentCommentId: string, reply: Comment) => {
    setReview((current) => ({
      ...current,
      comments: current.comments.map((comment) =>
        comment.id === parentCommentId
          ? { ...comment, replies: [...(comment.replies ?? []), reply] }
          : comment
      ),
    }));
  };

  const updateCommentStatusInState = (commentId: string, status: 'open' | 'resolved', resolvedBy?: string | null) => {
    const now = new Date().toISOString();
    setReview((current) => ({
      ...current,
      comments: current.comments.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              status,
              resolvedAt: status === 'resolved' ? now : null,
              resolvedBy: status === 'resolved' ? resolvedBy ?? 'Creator' : null,
              updatedAt: now,
            }
          : comment
      ),
    }));
  };

  const persistComment = (comment: Comment) => {
    setReview((current) => {
      const nextReview = { ...current, comments: [...current.comments, comment] };
      saveComment(nextReview, comment)
        .then(() => setSaveMessage('Comment saved.'))
        .catch((error) => setSaveMessage(error instanceof Error ? error.message : 'Could not save comment.'));
      return nextReview;
    });
    setActiveCommentId(comment.id);
  };

  const handleAddComment = (assetId: string, assetVersionId: string, x: number, y: number, text: string, author: string) => {
    if (!isCreator && !review.shareSettings.allowComments) {
      setSaveMessage('Comments are disabled for this review.');
      return;
    }

    if (!requireName()) {
      setPendingComment({ assetId, assetVersionId, x, y, text, author });
      return;
    }

    persistComment({
      id: `comment-${Date.now()}`,
      reviewId: review.id,
      assetId,
      assetVersionId,
      x,
      y,
      text,
      author: isCreator ? 'Creator' : author || reviewerName || 'Reviewer',
      authorRole: isCreator ? 'creator' : 'reviewer',
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      replies: [],
    });
    setPendingComment(null);
  };

  const handleReplySubmit = async (commentId: string) => {
    if (!isCreator && !review.shareSettings.allowComments) {
      setSaveMessage('Replies are disabled for this review.');
      return;
    }

    if (!requireName()) return;

    const body = replyDrafts[commentId]?.trim();
    if (!body) return;

    try {
      const reply = await saveCommentReply({
        review,
        parentCommentId: commentId,
        body,
        authorName: isCreator ? 'Creator' : reviewerName || 'Reviewer',
        authorRole: isCreator ? 'creator' : 'reviewer',
      });
      addReplyToState(commentId, reply);
      setReplyDrafts((current) => ({ ...current, [commentId]: '' }));
      setSaveMessage('Reply saved.');
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Could not save reply.');
    }
  };

  const handleResolveComment = async (commentId: string) => {
    if (!isCreator) return;

    try {
      await resolveComment({ reviewId: review.id, commentId, resolvedBy: authUser?.email ?? 'Creator' });
      updateCommentStatusInState(commentId, 'resolved', authUser?.email ?? 'Creator');
      setSaveMessage('Comment resolved.');
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Could not resolve comment.');
    }
  };

  const handleReopenComment = async (commentId: string) => {
    if (!isCreator) return;

    try {
      await reopenComment({ reviewId: review.id, commentId, resolvedBy: authUser?.email ?? 'Creator' });
      updateCommentStatusInState(commentId, 'open', null);
      setSaveMessage('Comment reopened.');
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Could not reopen comment.');
    }
  };

  const handleNameSubmit = () => {
    if (!reviewerName.trim()) return;
    setShowIdentityModal(false);

    if (pendingComment) {
      const { assetId, assetVersionId, x, y, text, author } = pendingComment;
      setPendingComment(null);
      handleAddComment(assetId, assetVersionId, x, y, text, author);
    }
  };

  const handleFeedbackChange = (value: string) => {
    if (!isCreator && !review.shareSettings.allowComments) {
      setSaveMessage('Feedback is disabled for this review.');
      return;
    }

    if (!requireName()) return;
    setReview((current) => ({ ...current, overallFeedback: value }));
  };

  const handleSaveFeedback = async () => {
    if (!review.shareSettings.allowComments) {
      setSaveMessage('Feedback is disabled for this review.');
      return;
    }

    if (!requireName()) return;
    if (!review.overallFeedback.trim()) return;

    try {
      await saveReviewerFeedback({
        reviewId: review.id,
        reviewerName: reviewerName || 'Reviewer',
        body: review.overallFeedback.trim(),
      });
      setSaveMessage('Feedback saved.');
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Could not save feedback.');
    }
  };

  const persistDecision = async (type: ReviewerDecisionType, note: string, assetVersionId?: string | null) => {
    if (!review.shareSettings.allowDecisions) {
      setSaveMessage('Decisions are disabled for this review.');
      return;
    }

    try {
      await saveReviewerDecision({
        reviewId: review.id,
        assetVersionId: assetVersionId ?? null,
        reviewerName: reviewerName || 'Reviewer',
        type,
        note,
      });
      setSaveMessage('Decision saved.');
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Could not save decision.');
    }
  };

  const handleSelectVersion = () => {
    if (!requireName() || !activeVersion) return;
    const note = `Selected version: ${activeVersion.label}`;
    setReview((current) => ({ ...current, selectedDirection: activeVersion.id, selectedAssetVersionId: activeVersion.id, decision: note }));
    void persistDecision('direction_selected', note, activeVersion.id);
  };

  const handleDecisionChange = (decision: string, type: ReviewerDecisionType) => {
    if (!requireName()) return;
    setReview((current) => ({ ...current, decision }));
    void persistDecision(type, decision, null);
  };

  const renderAssetRailButton = (asset: ReviewAsset) => {
    const thumbnailVersion = asset.versions.find((version) => version.thumbnailUrl || version.previewUrl) ?? asset.versions[0];
    const isActive = activeAsset?.id === asset.id;

    return (
    <article
      key={asset.id}
      className={`group relative w-full rounded-md border bg-surface p-2 text-left transition ${isActive ? 'border-brand shadow-sm' : 'border-transparent hover:border-border'}`}
    >
      <button
        type="button"
        onClick={() => {
          setActiveAssetId(asset.id);
          setActiveVersionId(asset.versions[0]?.id ?? '');
          setActiveCommentId(null);
        }}
        className="block w-full text-left"
      >
        <div className={`flex h-20 items-center justify-center overflow-hidden rounded-[8px] bg-gradient-to-br ${asset.accent ?? 'from-stone-700 via-stone-500 to-stone-200'} text-[10px] font-semibold uppercase tracking-[0.18em] text-white`}>
          {thumbnailVersion?.thumbnailUrl || thumbnailVersion?.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Review thumbnails may be blob or storage URLs.
            <img src={thumbnailVersion.thumbnailUrl ?? thumbnailVersion.previewUrl} alt="" className="h-full w-full rounded-[8px] object-cover" />
          ) : (
            asset.assetType
          )}
        </div>
        <div className="mt-2 flex items-start justify-between gap-2">
          <span className="text-xs font-semibold leading-4 text-text">{asset.title}</span>
          {isCreator ? <span className="text-text-subtle">...</span> : null}
        </div>
      </button>
      {isCreator ? (
        <button
          type="button"
          aria-label={`Delete ${asset.title}`}
          title="Delete asset"
          onClick={(event) => {
            event.stopPropagation();
            void handleDeleteAsset(asset);
          }}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-rose-700 shadow-sm ring-1 ring-rose-100 transition hover:bg-rose-50"
        >
          <FiTrash2 aria-hidden="true" className="h-4 w-4" />
        </button>
      ) : null}
    </article>
    );
  };

  const activeVersionHasPreview = Boolean(activeVersion?.previewUrl && activeVersion.status === 'ready');

  return (
    <main className="flex min-h-screen flex-col bg-canvas text-text">
      {showIdentityModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 px-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-text-subtle">Reviewer access</p>
            <h2 className="mt-2 text-2xl font-semibold text-text">Before feedback, tell us who you are</h2>
            <p className="mt-3 text-sm text-text-muted">This keeps comments and decisions attached to the right reviewer without needing an account.</p>

            {review.shareSettings.pinProtection ? (
              <div className="mt-4 rounded-lg border border-border bg-surface-muted p-4">
                <label className="block text-sm font-medium text-text-muted">PIN (demo only)</label>
                <input className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm" placeholder="1234" />
              </div>
            ) : null}

            <label className="mt-4 block text-sm font-medium text-text-muted">Reviewer name</label>
            <input
              value={reviewerName}
              onChange={(event) => setReviewerName(event.target.value)}
              placeholder="Alex Morgan"
              className="mt-2 w-full rounded-md border border-border bg-surface-muted px-3 py-2.5 text-sm"
            />
            <button type="button" onClick={handleNameSubmit} className="mt-5 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong">
              Continue to review
            </button>
          </div>
        </div>
      ) : null}

      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur lg:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            {isCreator ? <BrandLogo href="/dashboard" /> : null}
            <span className="h-5 w-px bg-border" />
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-text-subtle">{isCreator ? 'Creator workspace' : 'Client review'}</span>
            <h1 className="min-w-0 text-sm font-semibold text-text sm:text-base">{review.title}</h1>
            {saveMessage ? <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs text-text-muted">{saveMessage}</span> : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isCreator ? (
              <>
                <Link href={review.shareToken ? `/review/${review.shareToken}` : `/review/${review.id}`} target="_blank" rel="noreferrer" className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-text-muted hover:bg-surface-muted">Preview as client</Link>
                <button type="button" onClick={() => void copyReviewLink()} className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-text-muted hover:bg-surface-muted">Copy review link</button>
                <button type="button" onClick={handleSaveReview} disabled={isSaving || isCheckingAuth || (isSupabaseConfigured() && !authUser)} className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60">
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <div className="rounded-md bg-surface-muted px-3 py-2 text-sm text-text-muted">{authUser?.email ?? 'Not signed in'}</div>
              </>
            ) : (
              <>
                <div className="rounded-md bg-surface-muted px-3 py-2 text-sm text-text-muted">{review.client || 'Client'}</div>
                <input value={reviewerName} onChange={(event) => setReviewerName(event.target.value)} placeholder="Your name" className="w-40 rounded-md border border-border bg-surface px-3 py-2 text-sm" />
              </>
            )}
          </div>
        </div>
      </header>

      <div className="grid flex-1 lg:grid-cols-[156px_minmax(0,1fr)_360px]">
        <aside className="border-b border-border bg-surface-muted/80 p-3 lg:border-b-0 lg:border-r">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-text-subtle">Assets</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-1">
            {review.assets.length ? review.assets.map(renderAssetRailButton) : (
              <div className="rounded-md border border-dashed border-border-strong bg-surface p-3 text-xs leading-5 text-text-subtle">No assets in this review yet.</div>
            )}
          </div>
          {isCreator ? (
            <button type="button" onClick={addRelatedAsset} className="mt-3 flex w-full justify-center rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-strong">
              Add asset
            </button>
          ) : null}
          {uploadMessage ? <p className="mt-3 text-xs leading-5 text-text-subtle">{uploadMessage}</p> : null}
        </aside>

        <section className="min-w-0 px-4 py-4 lg:px-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            className="sr-only"
            onChange={handleAssetUpload}
            disabled={isSupabaseConfigured() && !authUser}
          />
          <div className="flex flex-col gap-3 border-b border-stone-200 pb-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {(activeAsset?.versions ?? []).map((version, index) => (
                <button
                  key={version.id}
                  type="button"
                  onClick={() => {
                    setActiveVersionId(version.id);
                    setActiveCommentId(null);
                  }}
                  className={`rounded-[8px] px-3 py-2 text-sm font-semibold ${activeVersion?.id === version.id ? 'bg-stone-950 text-white' : 'bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50'}`}
                >
                  {version.label || versionLabel(index)}
                </button>
              ))}
              {isCreator ? (
                <>
                  <button type="button" onClick={addVersion} className="rounded-[8px] border border-dashed border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">+ Add version</button>
                  {hasMultipleVersions ? (
                    <button type="button" onClick={() => void handleDeleteVersion()} disabled={!activeVersion} className="rounded-[8px] border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50">Delete version</button>
                  ) : null}
                </>
              ) : null}
            </div>
            <p className="text-sm text-stone-500">{isCreator || review.shareSettings.allowComments ? 'Click the preview to add a pinned note.' : 'Pinned notes are disabled for this review.'}</p>
          </div>

          <div className="mt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-stone-950">{activeVersion?.label ?? versionLabel(activeVersionIndex)}</p>
                <p className="text-sm text-stone-600">{activeAsset?.description ?? 'A preview-ready surface for the reviewer.'}</p>
              </div>
              {!isCreator ? (
                <div className="flex flex-wrap items-center gap-2">
                  {hasMultipleVersions ? (
                    <button type="button" onClick={handleSelectVersion} className="rounded-[8px] bg-stone-950 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-800">Select this version</button>
                  ) : null}
                  {activeVersionHasPreview ? (
                    <button
                      type="button"
                      onClick={downloadActivePreview}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                      aria-label="Download active preview"
                      title="Download active preview"
                    >
                      <FiDownload aria-hidden="true" className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="relative min-h-[470px] overflow-hidden rounded-[14px] border border-stone-200 bg-white/75 p-3 shadow-sm">
              {activeAsset ? (
                <>
                  {isCreator && activeVersion && !activeVersionHasPreview ? (
                    <div
                      role="button"
                      tabIndex={0}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setIsDropTargetActive(true);
                      }}
                      onDragLeave={() => setIsDropTargetActive(false)}
                      onDrop={(event) => void handleDropFile(event)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click();
                      }}
                      className={`flex min-h-[440px] flex-col items-center justify-center rounded-[12px] border border-dashed p-6 text-center transition ${isDropTargetActive ? 'border-stone-950 bg-stone-200' : 'border-stone-300 bg-stone-100'}`}
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-stone-800 shadow-sm ring-1 ring-stone-200">
                        <FiUploadCloud aria-hidden="true" className="h-7 w-7" />
                      </div>
                      <p className="mt-4 text-sm font-semibold text-stone-950">Drop a file here</p>
                      <p className="mt-1 max-w-sm text-sm leading-6 text-stone-600">Upload a preview or paste an image from your clipboard for this version.</p>
                      <div className="mt-5 flex flex-wrap justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handlePasteFromClipboard()}
                          className="inline-flex items-center gap-2 rounded-[8px] border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50"
                        >
                          <FiClipboard aria-hidden="true" className="h-4 w-4" />
                          Paste from clipboard
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isSupabaseConfigured() && !authUser}
                          className="inline-flex items-center gap-2 rounded-[8px] bg-stone-950 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <FiUploadCloud aria-hidden="true" className="h-4 w-4" />
                          Upload
                        </button>
                      </div>
                    </div>
                  ) : (
                    <AssetSurface
                      asset={activeAsset}
                      version={activeVersion}
                      overlay={activeVersionHasPreview && showPins && (isCreator || review.shareSettings.allowComments) ? (
                        <PinCommentLayer
                          asset={activeAsset}
                          version={activeVersion}
                          comments={review.comments}
                          onAddComment={handleAddComment}
                          activeCommentId={activeCommentId}
                          onSelectComment={setActiveCommentId}
                        />
                      ) : null}
                    />
                  )}
                </>
              ) : (
                <div className="flex min-h-[440px] items-center justify-center rounded-[12px] border border-dashed border-stone-300 bg-stone-50 text-center">
                  <p className="max-w-[240px] text-sm text-stone-600">This review has no assets yet.</p>
                </div>
              )}
            </div>

            {activeAsset?.assetType === 'pdf' && activeVersion?.pageCount ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {Array.from({ length: activeVersion.pageCount ?? 0 }, (_, index) => (
                  <button key={index + 1} type="button" onClick={() => setActivePdfPage(index + 1)} className={`rounded-[8px] px-3 py-2 text-sm font-semibold ${activePdfPage === index + 1 ? 'bg-stone-950 text-white' : 'bg-white text-stone-700 ring-1 ring-stone-200'}`}>
                    Page {index + 1}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <aside className="border-t border-stone-200 bg-white p-4 lg:border-l lg:border-t-0">
          <div className="flex rounded-[10px] bg-stone-100 p-1">
            {[
              { key: 'notes' as const, label: 'Pinned notes' },
              { key: 'feedback' as const, label: 'Overall feedback' },
            ].map((tab) => (
              <button key={tab.key} type="button" onClick={() => setRightTab(tab.key)} className={`flex-1 rounded-[8px] px-3 py-2 text-sm font-semibold ${rightTab === tab.key ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-600'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {rightTab === 'notes' ? (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { key: 'all' as const, label: `All ${assetComments.length}` },
                  { key: 'open' as const, label: `Open ${assetComments.filter((comment) => (comment.status ?? 'open') === 'open').length}` },
                  { key: 'resolved' as const, label: `Resolved ${assetComments.filter((comment) => comment.status === 'resolved').length}` },
                ].map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setCommentFilter(filter.key)}
                    className={`rounded-[8px] px-2.5 py-1.5 text-xs font-semibold ${commentFilter === filter.key ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-600'}`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <p className="text-xs text-stone-500">{openCommentCount} open comments / {resolvedCommentCount} resolved across this review</p>

              {filteredAssetComments.length > 0 ? filteredAssetComments.map((comment, index) => (
                <article
                  key={comment.id}
                  className={`rounded-[10px] border px-3 py-2.5 text-sm ${activeCommentId === comment.id ? 'border-stone-950 bg-stone-950 text-white' : comment.status === 'resolved' ? 'border-stone-200 bg-stone-50 text-stone-500' : 'border-stone-200 bg-white text-stone-700'}`}
                >
                  <button type="button" onClick={() => setActiveCommentId(comment.id)} className="block w-full text-left">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{comment.author}</span>
                      <span className="text-xs uppercase tracking-[0.18em]">Pin {index + 1}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <span className={`rounded-full px-2 py-0.5 ${comment.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>{comment.status === 'resolved' ? 'Resolved' : 'Open'}</span>
                      <span>{comment.authorRole === 'creator' ? 'Creator' : 'Reviewer'}</span>
                      {comment.createdAt ? <span>{new Date(comment.createdAt).toLocaleDateString()}</span> : null}
                    </div>
                    <p className="mt-2 text-sm">{comment.text}</p>
                  </button>

                  {(comment.replies ?? []).length > 0 ? (
                    <div className={`mt-3 space-y-2 border-l pl-3 ${activeCommentId === comment.id ? 'border-white/30' : 'border-stone-200'}`}>
                      {(comment.replies ?? []).map((reply) => (
                        <div key={reply.id} className="text-sm">
                          <div className="flex flex-wrap items-center gap-2 text-xs opacity-80">
                            <span className="font-semibold">{reply.author}</span>
                            <span>{reply.authorRole === 'creator' ? 'Creator' : 'Reviewer'}</span>
                            {reply.createdAt ? <span>{new Date(reply.createdAt).toLocaleDateString()}</span> : null}
                          </div>
                          <p className="mt-1">{reply.text}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {(isCreator || review.shareSettings.allowComments) ? (
                    <div className="mt-3 grid gap-2">
                      <textarea
                        value={replyDrafts[comment.id] ?? ''}
                        onChange={(event) => setReplyDrafts((current) => ({ ...current, [comment.id]: event.target.value }))}
                        placeholder="Reply to this thread"
                        className="min-h-16 rounded-[8px] border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => void handleReplySubmit(comment.id)} className="rounded-[8px] border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700">Reply</button>
                        {isCreator && (comment.status ?? 'open') === 'open' ? (
                          <button type="button" onClick={() => void handleResolveComment(comment.id)} className="rounded-[8px] bg-stone-950 px-3 py-1.5 text-xs font-semibold text-white">Resolve</button>
                        ) : null}
                        {isCreator && comment.status === 'resolved' ? (
                          <button type="button" onClick={() => void handleReopenComment(comment.id)} className="rounded-[8px] border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700">Reopen</button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </article>
              )) : (
                <p className="rounded-[10px] border border-dashed border-stone-300 bg-stone-50 px-3 py-3 text-sm text-stone-600">{review.shareSettings.allowComments || isCreator ? 'Click the preview to add a pinned note.' : 'Comments are disabled for this review.'}</p>
              )}
            </div>
          ) : (
            <div className="mt-4">
              <FeedbackPanel value={review.overallFeedback} onChange={handleFeedbackChange} label="Overall feedback" />
              {!isCreator && review.shareSettings.allowComments ? (
                <button type="button" onClick={handleSaveFeedback} className="mt-3 rounded-[8px] bg-stone-950 px-3 py-2 text-sm font-semibold text-white">Save feedback</button>
              ) : null}
              {!isCreator && !review.shareSettings.allowComments ? <p className="mt-3 text-sm text-stone-500">Feedback is disabled for this review.</p> : null}
            </div>
          )}

          <div className="mt-5 border-t border-stone-200 pt-5">
            <p className="text-sm font-semibold text-stone-950">Final decision</p>
            {!isCreator && review.shareSettings.allowDecisions ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => handleDecisionChange('Approve', 'approved')} className="rounded-[8px] bg-stone-950 px-3 py-2 text-sm font-semibold text-white">Approve</button>
                <button type="button" onClick={() => handleDecisionChange('Request changes', 'changes_requested')} className="rounded-[8px] border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700">Request changes</button>
                {hasMultipleVersions ? (
                  <>
                    <button type="button" onClick={handleSelectVersion} className="rounded-[8px] border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700">Select this version</button>
                    <button type="button" onClick={() => handleDecisionChange('Suggest combining versions', 'combine_options')} className="rounded-[8px] border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700">Suggest combining versions</button>
                  </>
                ) : null}
              </div>
            ) : isCreator ? (
              <p className="mt-2 text-sm text-stone-600">{review.decision || 'Awaiting client decision.'}</p>
            ) : (
              <p className="mt-2 text-sm text-stone-500">Decision actions are disabled for this review.</p>
            )}
            {review.decision ? <div className="mt-3 rounded-[10px] border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{review.decision}</div> : null}
          </div>

          {isCreator ? (
            <div className="mt-5 border-t border-stone-200 pt-5">
              <p className="text-sm font-semibold text-stone-950">Review settings</p>
              <div className="mt-3 space-y-2">
                {[
                  { key: 'reviewerNameRequired' as const, label: 'Name required' },
                  { key: 'allowComments' as const, label: 'Allow comments' },
                  { key: 'allowDecisions' as const, label: 'Allow decisions' },
                ].map((setting) => (
                  <label key={setting.key} className="flex items-center justify-between rounded-[10px] bg-stone-50 px-3 py-2.5 text-sm text-stone-700">
                    <span>{setting.label}</span>
                    <input type="checkbox" checked={review.shareSettings[setting.key]} onChange={(event) => updateShareSetting(setting.key, event.target.checked)} className="h-4 w-4 rounded border-stone-300 text-stone-900" />
                  </label>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-stone-500">{shareSummary}</p>
              {authUser ? (
                <button type="button" onClick={handleSignOut} className="mt-3 rounded-[8px] border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700">Log out</button>
              ) : (
                <div className="mt-3 grid gap-2">
                  <button type="button" onClick={() => openAuthModal('login')} className="rounded-[8px] border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">
                    Sign in
                  </button>
                  <button type="button" onClick={() => openAuthModal('signup')} className="rounded-[8px] bg-stone-950 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-800">
                    Create account
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </aside>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-white px-4 py-3 text-sm text-stone-600 lg:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <span>{totalComments} comments</span>
          <button type="button" onClick={() => setShowPins((current) => !current)} className="rounded-[8px] border border-stone-200 px-3 py-1.5 font-semibold text-stone-700">{showPins ? 'Hide pins' : 'Show pins'}</button>
          <span className="rounded-[8px] bg-stone-100 px-3 py-1.5">Zoom 100%</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isCreator ? (
            <>
              <button type="button" onClick={addVersion} className="rounded-[8px] border border-stone-200 px-3 py-1.5 font-semibold text-stone-700">New version</button>
              <button type="button" onClick={() => void copyReviewLink()} className="rounded-[8px] bg-stone-950 px-3 py-1.5 font-semibold text-white">Share</button>
            </>
          ) : (
            <>
              {review.shareSettings.allowComments ? <button type="button" onClick={() => setRightTab('feedback')} className="rounded-[8px] border border-stone-200 px-3 py-1.5 font-semibold text-stone-700">Add general comment</button> : null}
              <button type="button" onClick={() => void copyReviewLink()} className="rounded-[8px] bg-stone-950 px-3 py-1.5 font-semibold text-white">Share review link</button>
            </>
          )}
        </div>
        {!isCreator ? (
          <Link href="/" className="text-xs font-semibold text-text-subtle hover:text-brand">
            Reviewed with WizerView
          </Link>
        ) : null}
      </footer>
      <Suspense fallback={null}>
        <AuthModal defaultNext={pathname || '/dashboard'} />
      </Suspense>
    </main>
  );
}
