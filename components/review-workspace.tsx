"use client";

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { FiCheckCircle, FiChevronDown, FiChevronLeft, FiChevronRight, FiClipboard, FiDownload, FiEdit3, FiMessageSquare, FiSliders, FiTrash2, FiUploadCloud, FiX } from 'react-icons/fi';
import type { User } from '@supabase/supabase-js';
import { AuthModal } from '@/components/auth/auth-modal';
import { AssetSurface } from '@/components/asset-surface';
import { BrandLogo } from '@/components/brand-logo';
import { FeedbackPanel } from '@/components/feedback-panel';
import { PinCommentLayer } from '@/components/pin-comment-layer';
import { estimateStorageSavings, processImagePreview, processPdfPreview } from '@/lib/asset-processing';
import type { AssetVersion, Comment, DecisionOutcome, ReviewAsset, ReviewData, ShareSettings } from '@/lib/mock-data';
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

function commentMatchesAssetVersion(comment: Comment, asset?: ReviewAsset, version?: AssetVersion) {
  if (!asset || comment.assetId !== asset.id) return false;
  if (!version) return false;
  if (comment.assetVersionId === version.id) return true;

  const legacyOptionId = typeof version.metadata?.legacyOptionId === 'string' ? version.metadata.legacyOptionId : null;
  if (legacyOptionId && (comment.assetVersionId === legacyOptionId || comment.optionId === legacyOptionId)) return true;

  return asset.versions.length <= 1 && !comment.assetVersionId && !comment.optionId;
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
  const [originFilter, setOriginFilter] = useState<'all' | 'client' | 'creator'>('all');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [showPins, setShowPins] = useState(true);
  const [isFeedbackDrawerOpen, setIsFeedbackDrawerOpen] = useState(isCreator);
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [isVersionMenuOpen, setIsVersionMenuOpen] = useState(false);
  const [isVersionNameDialogOpen, setIsVersionNameDialogOpen] = useState(false);
  const [versionNameMode, setVersionNameMode] = useState<'create' | 'rename'>('create');
  const [versionNameDraft, setVersionNameDraft] = useState('');
  const [isElsewhereOpen, setIsElsewhereOpen] = useState(true);
  const [isBriefExpanded, setIsBriefExpanded] = useState(isCreator);
  const [isEditingBrief, setIsEditingBrief] = useState(false);
  const [isEditingDeliverableBrief, setIsEditingDeliverableBrief] = useState(false);
  const [deliverableBriefDraft, setDeliverableBriefDraft] = useState('');
  const [isEditingVersionDescription, setIsEditingVersionDescription] = useState(false);
  const [versionDescriptionDraft, setVersionDescriptionDraft] = useState('');
  const [briefDraft, setBriefDraft] = useState(fallbackReview.brief);
  const [isDropTargetActive, setIsDropTargetActive] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isReviewLoaded, setIsReviewLoaded] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(isCreator && Boolean(supabase));
  const [hasMarkedSeen, setHasMarkedSeen] = useState(false);
  const [reviewerName, setReviewerName] = useState('');
  const [decisionNote, setDecisionNote] = useState('');
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
  const versionNameInputRef = useRef<HTMLInputElement | null>(null);
  const centerScrollRef = useRef<HTMLDivElement | null>(null);
  const feedbackDrawerRef = useRef<HTMLDivElement | null>(null);
  const discussionSectionRef = useRef<HTMLElement | null>(null);
  const decisionSectionRef = useRef<HTMLElement | null>(null);
  const settingsSectionRef = useRef<HTMLElement | null>(null);
  const previewScrollRef = useRef<HTMLDivElement | null>(null);
  const commentCardRefs = useRef<Record<string, HTMLElement | null>>({});
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
      setBriefDraft(loaded.brief);
      setDecisionNote(loaded.decisionOutcome?.note ?? '');
      setIsReviewLoaded(true);
    });

    return () => {
      ignored = true;
    };
  }, [fallbackReviewId, shareToken]);

  const drawerStorageKey = `wizerview:${mode}:${review.id}:feedback-drawer`;
  const briefStorageKey = `wizerview:brief:${review.shareToken ?? review.id}:${review.brief.updatedAt ?? 'unversioned'}`;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.sessionStorage.getItem(drawerStorageKey);
    setIsFeedbackDrawerOpen(saved == null ? isCreator : saved === 'open');
  }, [drawerStorageKey, isCreator]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(drawerStorageKey, isFeedbackDrawerOpen ? 'open' : 'closed');
  }, [drawerStorageKey, isFeedbackDrawerOpen]);

  useEffect(() => {
    setBriefDraft(review.brief);
  }, [review.brief]);

  useEffect(() => {
    if (isVersionNameDialogOpen) window.requestAnimationFrame(() => versionNameInputRef.current?.focus());
  }, [isVersionNameDialogOpen]);

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

  useEffect(() => {
    if (!activeCommentId) return;

    const revealActiveComment = () => {
      const previewScroller = previewScrollRef.current;
      const pin = previewScroller?.querySelector<HTMLElement>(`[data-pin-id="${activeCommentId}"]`);
      pin?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });

      commentCardRefs.current[activeCommentId]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(revealActiveComment);
    });

    const timer = window.setTimeout(revealActiveComment, 260);
    return () => window.clearTimeout(timer);
  }, [activeAssetId, activeCommentId, activeVersionId, isFeedbackDrawerOpen, rightTab]);

  useEffect(() => {
    if (!activeCommentId || typeof ResizeObserver === 'undefined') return;
    const target = centerScrollRef.current;
    if (!target) return;

    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        const pin = previewScrollRef.current?.querySelector<HTMLElement>(`[data-pin-id="${activeCommentId}"]`);
        pin?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
      });
    });

    observer.observe(target);
    return () => observer.disconnect();
  }, [activeCommentId]);

  const activeAsset = review.assets.find((asset) => asset.id === activeAssetId) ?? review.assets[0];
  const activeVersion = activeAsset?.versions.find((version) => version.id === activeVersionId) ?? activeAsset?.versions[0];
  const topLevelComments = review.comments.filter((comment) => !comment.parentCommentId);
  const assetComments = topLevelComments.filter((comment) => commentMatchesAssetVersion(comment, activeAsset, activeVersion));
  const filteredAssetComments = assetComments.filter((comment) => {
    const statusMatches = commentFilter === 'all' || (comment.status ?? 'open') === commentFilter;
    const originMatches =
      originFilter === 'all' ||
      (originFilter === 'creator' ? comment.authorRole === 'creator' : comment.authorRole !== 'creator');
    return statusMatches && originMatches;
  });
  const commentsOutsideActiveVersion = topLevelComments.filter((comment) => !commentMatchesAssetVersion(comment, activeAsset, activeVersion));
  const openCommentCount = getOpenCommentCount(review.comments);
  const resolvedCommentCount = getResolvedCommentCount(review.comments);
  const totalComments = topLevelComments.length;
  const hasMultipleVersions = (activeAsset?.versions.length ?? 0) > 1;
  const activeVersionHasPreview = Boolean(activeVersion?.previewUrl && activeVersion.status === 'ready');
  const hasBriefContent = Boolean(
    review.brief.message.trim() ||
    review.brief.requestedOutcome.trim() ||
    review.brief.focusPoints.some((point) => point.trim())
  );
  const selectedVersionLabel = review.selectedAssetVersionId
    ? review.assets.flatMap((asset) => asset.versions).find((version) => version.id === review.selectedAssetVersionId)?.label
    : null;
  const workflowSteps = [
    { label: 'Review brief', done: hasBriefContent },
    { label: 'Deliverable discussion', done: totalComments > 0 },
    { label: 'Deliverable decision', done: Boolean(review.selectedAssetVersionId) },
    { label: 'Review progress', done: openCommentCount === 0 && totalComments > 0 },
    { label: 'Finish review', done: Boolean(review.decision) },
  ];
  const shareSummary = useMemo(() => {
    const parts = [review.shareSettings.reviewerNameRequired ? 'name required' : 'name optional'];
    if (review.shareSettings.pinProtection) parts.push('PIN');
    if (review.shareSettings.allowComments) parts.push('comments');
    if (review.shareSettings.allowDecisions) parts.push('decisions');
    return parts.join(' / ');
  }, [review.shareSettings]);

  useEffect(() => {
    if (!isReviewLoaded) return;
    if (isCreator) {
      setIsBriefExpanded(hasBriefContent || isEditingBrief);
      return;
    }
    if (!hasBriefContent || typeof window === 'undefined') {
      setIsBriefExpanded(false);
      return;
    }
    setIsBriefExpanded(window.localStorage.getItem(briefStorageKey) !== 'seen');
  }, [briefStorageKey, hasBriefContent, isCreator, isEditingBrief, isReviewLoaded]);

  const markBriefSeen = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(briefStorageKey, 'seen');
    }
  };

  const collapseBrief = () => {
    if (!isCreator) markBriefSeen();
    setIsBriefExpanded(false);
  };

  const handleCenterScroll = () => {
    if (!isCreator && isBriefExpanded && centerScrollRef.current && centerScrollRef.current.scrollTop > 32) {
      collapseBrief();
    }
  };

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

  const getCommentLocationLabel = (comment: Comment) => {
    const commentAsset = review.assets.find((asset) => asset.id === comment.assetId);
    const commentVersion = commentAsset?.versions.find((version) => commentMatchesAssetVersion(comment, commentAsset, version));

    return [commentAsset?.title, commentVersion?.label].filter(Boolean).join(' / ') || 'Unknown location';
  };

  const focusComment = (comment: Comment) => {
    const commentAsset = review.assets.find((asset) => asset.id === comment.assetId);
    const commentVersion = commentAsset?.versions.find((version) => commentMatchesAssetVersion(comment, commentAsset, version));
    const nextVersionId = commentVersion?.id ?? comment.assetVersionId ?? commentAsset?.versions[0]?.id ?? '';

    setActiveAssetId(comment.assetId);
    setActiveVersionId(nextVersionId);
    setActiveCommentId(comment.id);
    setCommentFilter('all');
    setOriginFilter('all');
    setRightTab('notes');
    setIsFeedbackDrawerOpen(true);
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
              title: asset.title === 'Primary deliverable' ? file.name.replace(/\.[^.]+$/, '') : asset.title,
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
                title: asset.title === 'Primary deliverable' ? processed.originalName.replace(/\.[^.]+$/, '') : asset.title,
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

  const suggestedVersionName = activeAsset ? versionLabel(activeAsset.versions.length) : 'Version A';

  const openCreateVersionDialog = () => {
    if (!activeAsset) return;
    setVersionNameMode('create');
    setVersionNameDraft('');
    setIsVersionNameDialogOpen(true);
  };

  const openRenameVersionDialog = () => {
    if (!activeVersion) return;
    setVersionNameMode('rename');
    setVersionNameDraft(activeVersion.label);
    setIsVersionMenuOpen(false);
    setIsVersionNameDialogOpen(true);
  };

  const saveVersionName = () => {
    if (!activeAsset) return;
    const displayName = versionNameDraft.trim() || (versionNameMode === 'create' ? suggestedVersionName : activeVersion?.label || suggestedVersionName);

    if (versionNameMode === 'rename' && activeVersion) {
      setReview((current) => ({
        ...current,
        assets: current.assets.map((asset) => asset.id === activeAsset.id
          ? { ...asset, versions: asset.versions.map((version) => version.id === activeVersion.id ? { ...version, label: displayName } : version) }
          : asset),
      }));
      setIsVersionNameDialogOpen(false);
      return;
    }

    const nextIndex = activeAsset.versions.length;
    const newVersion: AssetVersion = {
      id: `${activeAsset.id}-version-${Date.now()}`,
      assetId: activeAsset.id,
      reviewId: review.id,
      label: displayName,
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
    setIsVersionNameDialogOpen(false);
  };

  const addRelatedAsset = () => {
    const newAssetId = `asset-${Date.now()}`;
    const newVersionId = `${newAssetId}-version-a`;
    const newAsset: ReviewAsset = {
      id: `asset-${Date.now()}`,
      reviewId: review.id,
      title: 'Related deliverable',
      assetType: 'screenshot',
      description: 'A new reviewable deliverable.',
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
      setSaveMessage(error instanceof Error ? error.message : 'Could not delete deliverable.');
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
    setCommentFilter('all');
    setOriginFilter('all');
    setRightTab('notes');
    setIsFeedbackDrawerOpen(true);
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

  const handleSaveBrief = () => {
    if (!isCreator) return;
    const nextBrief = {
      message: briefDraft.message.trim(),
      focusPoints: briefDraft.focusPoints.map((point) => point.trim()).filter(Boolean),
      requestedOutcome: briefDraft.requestedOutcome.trim(),
      updatedAt: new Date().toISOString(),
    };
    setReview((current) => ({ ...current, brief: nextBrief }));
    setBriefDraft(nextBrief);
    setIsEditingBrief(false);
    setIsBriefExpanded(true);
    setSaveMessage('Review brief updated.');
  };

  // Kept only for a non-rendered legacy branch while old persisted feedback remains readable.
  const handleFeedbackChange = () => {};
  const handleSaveFeedback = async () => {};

  const persistDecision = async (type: ReviewerDecisionType, assetVersionId?: string | null) => {
    if (!review.shareSettings.allowDecisions) {
      setSaveMessage('Decisions are disabled for this review.');
      return;
    }

    try {
      await saveReviewerDecision({
        reviewId: review.id,
        shareToken: review.shareToken,
        assetVersionId: assetVersionId ?? null,
        reviewerName: reviewerName || 'Reviewer',
        type,
        note: decisionNote.trim(),
      });
      const outcome: DecisionOutcome = { type, note: decisionNote.trim(), assetVersionId: assetVersionId ?? null, reviewerName: reviewerName || 'Reviewer', createdAt: new Date().toISOString() };
      setReview((current) => ({ ...current, decision: outcome.note, decisionOutcome: outcome, selectedDirection: assetVersionId ?? current.selectedDirection, selectedAssetVersionId: assetVersionId ?? current.selectedAssetVersionId }));
      setSaveMessage('Decision submitted.');
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Could not save decision.');
    }
  };

  const handleSelectVersion = () => {
    if (!requireName() || !activeVersion) return;
    void persistDecision('direction_selected', activeVersion.id);
  };

  const handleDecisionChange = (type: ReviewerDecisionType | string, legacyType?: ReviewerDecisionType) => {
    if (!requireName()) return;
    const decisionType = legacyType ?? type as ReviewerDecisionType;
    void persistDecision(decisionType, activeVersion?.id ?? null);
  };

  const openDrawerSection = (section: 'discussion' | 'decision' | 'settings') => {
    setIsFeedbackDrawerOpen(true);
    setIsAssetPickerOpen(false);
    setRightTab(section === 'discussion' ? 'notes' : 'feedback');
    const target = {
      discussion: discussionSectionRef,
      decision: decisionSectionRef,
      settings: settingsSectionRef,
    }[section];
    window.requestAnimationFrame(() => target.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const saveDeliverableBrief = () => {
    if (!activeAsset) return;
    setReview((current) => ({ ...current, assets: current.assets.map((asset) => asset.id === activeAsset.id ? { ...asset, description: deliverableBriefDraft.trim() } : asset) }));
    setIsEditingDeliverableBrief(false);
  };

  const saveVersionDescription = () => {
    if (!activeAsset || !activeVersion) return;
    setReview((current) => ({ ...current, assets: current.assets.map((asset) => asset.id === activeAsset.id ? { ...asset, versions: asset.versions.map((version) => version.id === activeVersion.id ? { ...version, metadata: { ...version.metadata, description: versionDescriptionDraft.trim() } } : version) } : asset) }));
    setIsEditingVersionDescription(false);
  };

  const renderDeliverableBrief = () => {
    const brief = activeAsset?.description?.trim() ?? '';
    const legacyBrief = review.brief.message.trim();
    if (!isCreator && !brief && !legacyBrief) return null;
    if (!brief && legacyBrief) return <section className="rounded-[12px] border border-stone-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Review brief</p><p className="mt-2 text-sm leading-6 text-stone-700">{legacyBrief}</p></section>;
    if (isCreator && !brief && !isEditingDeliverableBrief) return <button type="button" onClick={() => { setDeliverableBriefDraft(''); setIsEditingDeliverableBrief(true); }} className="inline-flex w-fit rounded-[8px] border border-dashed border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">Add brief</button>;
    if (isCreator && isEditingDeliverableBrief) return <section className="rounded-[12px] border border-stone-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Deliverable brief</p><textarea value={deliverableBriefDraft} onChange={(event) => setDeliverableBriefDraft(event.target.value)} placeholder="Explain what to review and what to focus on." className="mt-3 min-h-24 w-full rounded-[8px] border border-stone-200 px-3 py-2 text-sm" /><div className="mt-3 flex gap-2"><button type="button" onClick={() => setIsEditingDeliverableBrief(false)} className="rounded-[8px] px-3 py-2 text-sm font-semibold text-stone-700">Cancel</button><button type="button" onClick={saveDeliverableBrief} className="rounded-[8px] bg-stone-950 px-3 py-2 text-sm font-semibold text-white">Save brief</button></div></section>;
    return <section className="rounded-[12px] border border-stone-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Deliverable brief</p><p className="mt-2 text-sm leading-6 text-stone-800">{brief}</p></div>{isCreator ? <button type="button" onClick={() => { setDeliverableBriefDraft(brief); setIsEditingDeliverableBrief(true); }} className="rounded-[8px] border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700">Edit</button> : null}</div></section>;
  };

  const renderAssetRailButton = (asset: ReviewAsset) => {
    const thumbnailVersion = asset.versions.find((version) => version.thumbnailUrl || version.previewUrl) ?? asset.versions[0];
    const isActive = activeAsset?.id === asset.id;

    return (
    <article
      key={asset.id}
      className={`group relative w-full self-start rounded-md border bg-surface p-2 text-left transition ${isActive ? 'border-brand shadow-sm' : 'border-transparent hover:border-border'}`}
    >
      <button
        type="button"
        onClick={() => {
          setActiveAssetId(asset.id);
          setActiveVersionId(asset.versions[0]?.id ?? '');
          setActiveCommentId(null);
          setIsAssetPickerOpen(false);
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

  const renderReviewBrief = () => {
    if (!hasBriefContent && !isCreator) return null;

    if (isCreator && !hasBriefContent && !isEditingBrief) {
      return (
        <button
          type="button"
          onClick={() => {
            setBriefDraft(review.brief);
            setIsEditingBrief(true);
            setIsBriefExpanded(true);
          }}
          className="inline-flex w-fit items-center gap-2 rounded-[8px] border border-dashed border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 shadow-sm hover:bg-stone-50"
        >
          <FiEdit3 aria-hidden="true" className="h-4 w-4" />
          Add brief
        </button>
      );
    }

    if (isCreator && isEditingBrief) {
      return (
        <section className="rounded-[12px] border border-stone-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Review brief</p>
              <p className="mt-1 text-sm text-stone-600">Set the context clients should see before reviewing.</p>
            </div>
            <button type="button" onClick={handleSaveBrief} className="rounded-[8px] bg-stone-950 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-800">
              Save brief
            </button>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_0.9fr]">
            <label className="grid gap-1 text-sm font-semibold text-stone-800">
              Message
              <textarea
                value={briefDraft.message}
                onChange={(event) => setBriefDraft((current) => ({ ...current, message: event.target.value }))}
                className="min-h-24 rounded-[8px] border border-stone-200 px-3 py-2 text-sm font-normal text-stone-900"
                placeholder="What should the reviewer know before they start?"
              />
            </label>
            <div className="grid gap-3">
              <label className="grid gap-1 text-sm font-semibold text-stone-800">
                Focus points
                <textarea
                  value={briefDraft.focusPoints.join('\n')}
                  onChange={(event) => setBriefDraft((current) => ({ ...current, focusPoints: event.target.value.split('\n') }))}
                  className="min-h-24 rounded-[8px] border border-stone-200 px-3 py-2 text-sm font-normal text-stone-900"
                  placeholder="One point per line"
                />
              </label>
              <label className="grid gap-1 text-sm font-semibold text-stone-800">
                Requested outcome
                <input
                  value={briefDraft.requestedOutcome}
                  onChange={(event) => setBriefDraft((current) => ({ ...current, requestedOutcome: event.target.value }))}
                  className="rounded-[8px] border border-stone-200 px-3 py-2 text-sm font-normal text-stone-900"
                  placeholder="Select a direction, request changes, approve..."
                />
              </label>
            </div>
          </div>
        </section>
      );
    }

    if (!isBriefExpanded) {
      return (
        <button
          type="button"
          onClick={() => setIsBriefExpanded(true)}
          className="inline-flex w-fit items-center gap-2 rounded-[8px] border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700 shadow-sm hover:bg-stone-50"
        >
          Review brief
          <FiChevronDown aria-hidden="true" className="h-4 w-4" />
        </button>
      );
    }

    return (
      <section className="rounded-[12px] border border-stone-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Review brief</p>
            {review.brief.updatedAt ? <p className="mt-1 text-xs text-stone-500">Updated {new Date(review.brief.updatedAt).toLocaleDateString()}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {isCreator ? (
              <button type="button" onClick={() => setIsEditingBrief(true)} className="inline-flex items-center gap-2 rounded-[8px] border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">
                <FiEdit3 aria-hidden="true" className="h-4 w-4" />
                Edit
              </button>
            ) : (
              <button type="button" onClick={collapseBrief} className="rounded-[8px] bg-stone-950 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-800">
                Start reviewing
              </button>
            )}
            <button type="button" onClick={collapseBrief} className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-stone-200 text-stone-600 hover:bg-stone-50" aria-label="Collapse review brief">
              <FiChevronDown aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
        {review.brief.message ? <p className="mt-3 text-sm leading-6 text-stone-800">{review.brief.message}</p> : null}
        {review.brief.focusPoints.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {review.brief.focusPoints.map((point) => (
              <span key={point} className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">{point}</span>
            ))}
          </div>
        ) : null}
        {review.brief.requestedOutcome ? <p className="mt-3 text-sm font-semibold text-stone-950">{review.brief.requestedOutcome}</p> : null}
      </section>
    );
  };

  const renderCommentThread = (comment: Comment, index: number) => {
    const isActive = activeCommentId === comment.id;
    const isResolved = comment.status === 'resolved';
    const isCreatorNote = comment.authorRole === 'creator';

    return (
      <article
        key={comment.id}
        ref={(node) => {
          commentCardRefs.current[comment.id] = node;
        }}
        className={`rounded-[10px] border text-sm transition ${isActive ? 'border-stone-950 bg-white shadow-md' : isResolved ? 'border-stone-200 bg-stone-50' : 'border-stone-200 bg-white'}`}
      >
        <button type="button" onClick={() => focusComment(comment)} aria-expanded={isActive} className="block w-full px-3 py-2.5 text-left">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-stone-950">{comment.author}</span>
            <span className="text-xs uppercase tracking-[0.18em] text-stone-500">Pin {index + 1}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500">
            <span className={`rounded-full px-2 py-0.5 ${isResolved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>{isResolved ? 'Resolved' : 'Open'}</span>
            <span className={isCreatorNote ? 'font-semibold text-stone-900' : ''}>{isCreatorNote ? 'Creator note' : 'Client feedback'}</span>
            {comment.createdAt ? <span>{new Date(comment.createdAt).toLocaleDateString()}</span> : null}
            {(comment.replies ?? []).length > 0 ? <span>{comment.replies?.length} replies</span> : null}
          </div>
          <p className={`mt-2 text-sm leading-5 text-stone-700 ${isActive ? '' : 'line-clamp-2'}`}>{comment.text}</p>
        </button>

        {isActive ? (
          <div className="border-t border-stone-100 px-3 py-3">
            {(comment.replies ?? []).length > 0 ? (
            <div className="space-y-2 border-l border-stone-200 pl-3">
                {(comment.replies ?? []).map((reply) => (
                  <div key={reply.id} className="text-sm text-stone-700">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                      <span className="font-semibold text-stone-800">{reply.author}</span>
                      <span>{reply.authorRole === 'creator' ? 'Creator' : 'Client'}</span>
                      {reply.createdAt ? <span>{new Date(reply.createdAt).toLocaleDateString()}</span> : null}
                    </div>
                    <p className="mt-1 leading-5">{reply.text}</p>
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
          </div>
        ) : null}
      </article>
    );
  };

  const renderNotesPanel = () => (
    <section ref={discussionSectionRef} className="scroll-mt-4">
      <div className="bg-white pb-3">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Deliverable discussion</p>
          <p className="mt-1 text-sm text-stone-600">Pinned threads for the active deliverable and version.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all' as const, label: `All ${assetComments.length}` },
            { key: 'client' as const, label: `Client ${assetComments.filter((comment) => comment.authorRole !== 'creator').length}` },
            { key: 'creator' as const, label: `Creator ${assetComments.filter((comment) => comment.authorRole === 'creator').length}` },
          ].map((filter) => (
            <button key={filter.key} type="button" onClick={() => setOriginFilter(filter.key)} className={`rounded-[8px] px-2.5 py-1.5 text-xs font-semibold ${originFilter === filter.key ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-600'}`}>
              {filter.label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            { key: 'all' as const, label: `All status` },
            { key: 'open' as const, label: `Open ${assetComments.filter((comment) => (comment.status ?? 'open') === 'open').length}` },
            { key: 'resolved' as const, label: `Resolved ${assetComments.filter((comment) => comment.status === 'resolved').length}` },
          ].map((filter) => (
            <button key={filter.key} type="button" onClick={() => setCommentFilter(filter.key)} className={`rounded-[8px] px-2.5 py-1.5 text-xs font-semibold ${commentFilter === filter.key ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-600'}`}>
              {filter.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-stone-500">{openCommentCount} open / {resolvedCommentCount} resolved across this review</p>
      </div>

      <div className="space-y-3">
        {filteredAssetComments.length > 0 ? filteredAssetComments.map(renderCommentThread) : (
          <p className="rounded-[10px] border border-dashed border-stone-300 bg-stone-50 px-3 py-3 text-sm text-stone-600">{assetComments.length ? 'No discussion threads match these filters.' : review.shareSettings.allowComments || isCreator ? 'Click the preview to add a pinned discussion thread.' : 'Discussion is disabled for this review.'}</p>
        )}

        {commentsOutsideActiveVersion.length > 0 ? (
          <div className="rounded-[10px] border border-stone-200 bg-white px-3 py-3">
            <button type="button" onClick={() => setIsElsewhereOpen((current) => !current)} className="flex w-full items-center justify-between gap-3 text-left">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Elsewhere in review</span>
              <span className="text-xs font-semibold text-stone-500">{commentsOutsideActiveVersion.length}</span>
            </button>
            {isElsewhereOpen ? (
              <div className="mt-2 space-y-2">
                {commentsOutsideActiveVersion.slice(0, 6).map((comment) => (
                  <button key={comment.id} type="button" onClick={() => focusComment(comment)} className="block w-full rounded-[8px] bg-stone-50 px-2.5 py-2 text-left text-xs text-stone-700 hover:bg-stone-100">
                    <span className="block font-semibold text-stone-950">{getCommentLocationLabel(comment)}</span>
                    <span className="mt-1 block truncate">{comment.text}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );

  const renderOutcomePanel = () => {
    const outcome = review.decisionOutcome;
    const outcomeLabel = outcome?.type === 'changes_requested' ? 'Changes requested' : outcome?.type === 'direction_selected' ? 'Version selected' : outcome?.type === 'combine_options' ? 'Merge ideas requested' : 'Approved';
    const noteLabel = hasMultipleVersions ? 'Why did you choose this version?' : 'Anything else the creator should know?';
    return (
      <section ref={decisionSectionRef} className="scroll-mt-4 rounded-[12px] border border-stone-200 bg-white p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Deliverable decision</p>
        <div className="mt-3 rounded-[10px] bg-stone-50 px-3 py-2 text-sm text-stone-700"><span className="font-semibold text-stone-950">Deliverable:</span> {activeAsset?.title ?? 'No deliverable'}</div>
        {selectedVersionLabel ? <p className="mt-2 rounded-[10px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Selected version: {selectedVersionLabel}</p> : null}
        {!isCreator && review.shareSettings.allowDecisions ? <>
          <label className="mt-4 block text-sm font-semibold text-stone-900">{noteLabel}<textarea value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} placeholder={hasMultipleVersions ? 'Optional decision note' : 'Optional decision note'} className="mt-2 min-h-24 w-full rounded-[8px] border border-stone-200 px-3 py-2 text-sm font-normal" /></label>
          <p className="mt-1 text-xs text-stone-500">Optional</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button type="button" onClick={() => handleDecisionChange('changes_requested')} className="rounded-[8px] border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700">Request changes</button>
            {hasMultipleVersions ? <button type="button" onClick={handleSelectVersion} className="rounded-[8px] bg-stone-950 px-3 py-2 text-sm font-semibold text-white">Select {activeVersion?.label ?? 'version'}</button> : <button type="button" onClick={() => handleDecisionChange('approved')} className="rounded-[8px] bg-stone-950 px-3 py-2 text-sm font-semibold text-white">Approve</button>}
          </div>
        </> : null}
        {isCreator ? (outcome ? <div className="mt-4 rounded-[10px] border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><p className="font-semibold uppercase tracking-wide">{outcomeLabel}</p>{outcome.assetVersionId ? <p className="mt-1">Version: {selectedVersionLabel ?? 'Selected version'}</p> : null}{outcome.note ? <p className="mt-2 italic">“{outcome.note}”</p> : null}<p className="mt-2 text-xs text-emerald-800">{outcome.reviewerName ?? 'Reviewer'}{outcome.createdAt ? ` · ${new Date(outcome.createdAt).toLocaleDateString()}` : ''}</p></div> : <p className="mt-3 text-sm text-stone-600">Awaiting client decision.</p>) : null}
        {!isCreator && !review.shareSettings.allowDecisions ? <p className="mt-3 text-sm text-stone-500">Decisions are disabled for this review.</p> : null}
        {isCreator && review.overallFeedback ? <div className="mt-4 border-t border-stone-200 pt-3 text-sm text-stone-600"><p className="font-semibold text-stone-800">Previous overall feedback</p><p className="mt-1">{review.overallFeedback}</p></div> : null}
      </section>
    );
  };

  const renderFeedbackRail = () => (
    <aside className="flex min-h-0 flex-col items-center gap-2 border-t border-stone-200 bg-white p-2 lg:border-l lg:border-t-0">
      <button
        type="button"
        onClick={() => {
          openDrawerSection('discussion');
        }}
        aria-label="Open deliverable discussion"
        aria-expanded={isFeedbackDrawerOpen && rightTab === 'notes'}
        title="Deliverable discussion"
        className={`relative flex h-11 w-11 items-center justify-center rounded-[10px] ${rightTab === 'notes' && isFeedbackDrawerOpen ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}
      >
        <FiMessageSquare aria-hidden="true" className="h-5 w-5" />
        {openCommentCount > 0 ? <span className="absolute -right-1 -top-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{openCommentCount}</span> : null}
      </button>
      <button
        type="button"
        onClick={() => {
          openDrawerSection('decision');
        }}
        aria-label="Open decision progress and finish"
        aria-expanded={isFeedbackDrawerOpen && rightTab === 'feedback'}
        title="Decision, progress, finish"
        className={`flex h-11 w-11 items-center justify-center rounded-[10px] ${rightTab === 'feedback' && isFeedbackDrawerOpen ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}
      >
        <FiCheckCircle aria-hidden="true" className="h-5 w-5" />
      </button>
      {isCreator ? (
        <button type="button" onClick={() => openDrawerSection('settings')} aria-label="Open creator settings" title="Creator settings" className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-stone-100 text-stone-700 hover:bg-stone-200">
          <FiSliders aria-hidden="true" className="h-5 w-5" />
        </button>
      ) : null}
      <button type="button" onClick={() => setIsFeedbackDrawerOpen((current) => !current)} aria-label={isFeedbackDrawerOpen ? 'Close feedback drawer' : 'Open feedback drawer'} title={isFeedbackDrawerOpen ? 'Close drawer' : 'Open drawer'} className="mt-auto flex h-11 w-11 items-center justify-center rounded-[10px] border border-stone-200 text-stone-600 hover:bg-stone-50">
        {isFeedbackDrawerOpen ? <FiChevronRight aria-hidden="true" className="h-5 w-5" /> : <FiChevronLeft aria-hidden="true" className="h-5 w-5" />}
      </button>
    </aside>
  );

  const renderShareMenu = () => (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsShareMenuOpen((current) => !current)}
        className="inline-flex items-center gap-2 rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-strong"
        aria-expanded={isShareMenuOpen}
      >
        Share
        <FiChevronDown aria-hidden="true" className="h-4 w-4" />
      </button>
      {isShareMenuOpen ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-md border border-border bg-surface p-2 text-sm shadow-xl">
          <button
            type="button"
            onClick={() => {
              setIsShareMenuOpen(false);
              void copyReviewLink();
            }}
            className="block w-full rounded-[8px] px-3 py-2 text-left font-semibold text-text hover:bg-surface-muted"
          >
            Copy review link
          </button>
          {review.shareToken ? (
            <Link
              href={`/review/${review.shareToken}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => setIsShareMenuOpen(false)}
              className="block rounded-[8px] px-3 py-2 font-semibold text-text hover:bg-surface-muted"
            >
              Open client view
            </Link>
          ) : null}
          {isCreator ? <p className="px-3 py-2 text-xs leading-5 text-text-subtle">{shareSummary}</p> : null}
        </div>
      ) : null}
    </div>
  );

  return (
    <main className="flex h-screen min-h-0 flex-col overflow-hidden bg-canvas text-text">
      {isVersionNameDialogOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/45 px-4" onMouseDown={() => setIsVersionNameDialogOpen(false)}>
          <form onSubmit={(event) => { event.preventDefault(); saveVersionName(); }} onMouseDown={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key === 'Escape') setIsVersionNameDialogOpen(false); }} className="w-full max-w-sm rounded-[14px] border border-stone-200 bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-semibold text-stone-950">{versionNameMode === 'create' ? 'New Version' : 'Rename Version'}</h2>
            <label className="mt-4 block text-sm font-semibold text-stone-800">
              Version name
              <input ref={versionNameInputRef} value={versionNameDraft} onChange={(event) => setVersionNameDraft(event.target.value)} placeholder={suggestedVersionName} className="mt-2 w-full rounded-[8px] border border-stone-200 px-3 py-2.5 text-sm font-normal text-stone-950 outline-none focus:border-stone-500" />
            </label>
            <p className="mt-2 text-sm leading-5 text-stone-500">Give this version a descriptive name. You can always rename it later.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setIsVersionNameDialogOpen(false)} className="rounded-[8px] px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100">Cancel</button>
              <button type="submit" className="rounded-[8px] bg-stone-950 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-800">{versionNameMode === 'create' ? 'Create Version' : 'Save name'}</button>
            </div>
          </form>
        </div>
      ) : null}
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

      <header className="z-30 flex-none border-b border-border bg-surface/95 px-4 py-3 backdrop-blur lg:px-6">
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
                {renderShareMenu()}
                <button type="button" onClick={handleSaveReview} disabled={isSaving || isCheckingAuth || (isSupabaseConfigured() && !authUser)} className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60">
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <div className="rounded-md bg-surface-muted px-3 py-2 text-sm text-text-muted">{authUser?.email ?? 'Not signed in'}</div>
              </>
            ) : (
              <>
                <div className="rounded-md bg-surface-muted px-3 py-2 text-sm text-text-muted">{review.client || 'Client'}</div>
                <input value={reviewerName} onChange={(event) => setReviewerName(event.target.value)} placeholder="Your name" className="w-40 rounded-md border border-border bg-surface px-3 py-2 text-sm" />
                {renderShareMenu()}
              </>
            )}
          </div>
        </div>
      </header>

      <div className={`grid min-h-0 flex-1 transition-[grid-template-columns] duration-200 ${isFeedbackDrawerOpen ? 'lg:grid-cols-[52px_minmax(0,1fr)_460px]' : 'lg:grid-cols-[156px_minmax(0,1fr)_64px]'}`}>
        <aside className="relative flex min-h-0 flex-col border-b border-border bg-surface-muted/80 p-3 lg:border-b-0 lg:border-r">
          {isFeedbackDrawerOpen ? (
            <>
              <button
                type="button"
                onClick={() => setIsAssetPickerOpen((current) => !current)}
                className="flex min-h-24 w-full items-center justify-center rounded-md border border-border bg-surface px-2 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted hover:bg-surface-muted [writing-mode:vertical-rl]"
                aria-expanded={isAssetPickerOpen}
                aria-label="Open deliverables picker"
                title="Deliverables"
              >
                Deliverables
              </button>
              {isAssetPickerOpen ? (
                <div className="absolute left-full top-3 z-40 ml-2 flex max-h-[calc(100vh-160px)] w-44 flex-col rounded-md border border-border bg-surface p-3 shadow-xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-text-subtle">Deliverables</p>
                  <div className="mt-3 grid min-h-0 flex-1 auto-rows-max content-start gap-2 overflow-y-auto pr-1">
                    {review.assets.length ? review.assets.map(renderAssetRailButton) : (
                      <div className="rounded-md border border-dashed border-border-strong bg-surface p-3 text-xs leading-5 text-text-subtle">No deliverables in this review yet.</div>
                    )}
                  </div>
                  {isCreator ? (
                    <button type="button" onClick={addRelatedAsset} className="mt-3 flex w-full justify-center rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-strong">
                      Add deliverable
                    </button>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-text-subtle">Deliverables</p>
              <div className="mt-3 grid min-h-0 flex-1 auto-rows-max content-start grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-4 lg:grid-cols-1">
                {review.assets.length ? review.assets.map(renderAssetRailButton) : (
                  <div className="rounded-md border border-dashed border-border-strong bg-surface p-3 text-xs leading-5 text-text-subtle">No deliverables in this review yet.</div>
                )}
              </div>
              {isCreator ? (
                <button type="button" onClick={addRelatedAsset} className="mt-3 flex w-full justify-center rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-strong">
                  Add deliverable
                </button>
              ) : null}
            </>
          )}
          {uploadMessage && !isFeedbackDrawerOpen ? <p className="mt-3 text-xs leading-5 text-text-subtle">{uploadMessage}</p> : null}
        </aside>

        <div className="relative min-h-0 min-w-0 overflow-hidden">
        <section ref={centerScrollRef} onScroll={handleCenterScroll} className="flex h-full min-h-0 min-w-0 flex-col gap-4 overflow-auto px-4 py-4 lg:px-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            className="sr-only"
            onChange={handleAssetUpload}
            disabled={isSupabaseConfigured() && !authUser}
          />
          <h2 className="text-lg font-semibold text-stone-950">{activeAsset?.title ?? 'Deliverable'}</h2>
          {renderDeliverableBrief()}
          <div className="sticky top-0 z-20 flex flex-none flex-col gap-3 border-b border-stone-200 bg-canvas/95 pb-4 pt-1 backdrop-blur xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto pb-1">
              {(activeAsset?.versions ?? []).map((version, index) => (
                <button
                  key={version.id}
                  type="button"
                  onClick={() => {
                    setActiveVersionId(version.id);
                    setActiveCommentId(null);
                  }}
                  className={`max-w-52 truncate rounded-[8px] px-3 py-2 text-sm font-semibold ${activeVersion?.id === version.id ? 'bg-stone-950 text-white' : 'bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50'}`}
                >
                  {version.label || versionLabel(index)}
                </button>
              ))}
                  {isCreator ? (
                <>
                  <button type="button" onClick={openCreateVersionDialog} className="rounded-[8px] border border-dashed border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">+ Add version</button>
                  {hasMultipleVersions ? (
                    <button type="button" onClick={() => void handleDeleteVersion()} disabled={!activeVersion} aria-label="Delete active version" title="Delete active version" className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50">
                      <FiTrash2 aria-hidden="true" className="h-4 w-4" />
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
            <div className="relative flex flex-wrap items-center gap-2">
              {!isCreator && hasMultipleVersions ? (
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
              <button type="button" onClick={() => setIsVersionMenuOpen((current) => !current)} className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-stone-200 bg-white text-stone-700 hover:bg-stone-50" aria-label="Version options" title="Version options">
                <FiChevronDown aria-hidden="true" className="h-4 w-4" />
              </button>
              {isVersionMenuOpen ? (
                <div className="absolute right-0 top-12 z-30 w-72 rounded-[10px] border border-stone-200 bg-white p-3 text-sm shadow-xl">
                  <p className="font-semibold text-stone-950">{activeVersion?.label ?? 'Version'}</p>
                  {isCreator ? <button type="button" onClick={openRenameVersionDialog} className="mt-3 w-full rounded-[8px] border border-stone-200 px-3 py-2 text-left text-sm font-semibold text-stone-700 hover:bg-stone-50">Rename version</button> : null}
                </div>
              ) : null}
            </div>
          </div>

          {typeof activeVersion?.metadata?.description === 'string' && activeVersion.metadata.description ? <section className="rounded-[10px] border border-stone-200 bg-white px-4 py-3"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Version description</p><p className="mt-2 text-sm leading-6 text-stone-700">{activeVersion.metadata.description}</p></div>{isCreator ? <button type="button" onClick={() => { setVersionDescriptionDraft(activeVersion.metadata?.description as string); setIsEditingVersionDescription(true); }} className="rounded-[8px] border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700">Edit</button> : null}</div></section> : isCreator ? <button type="button" onClick={() => { setVersionDescriptionDraft(''); setIsEditingVersionDescription(true); }} className="w-fit text-sm font-semibold text-stone-600 hover:text-stone-950">Add version description</button> : null}
          {isEditingVersionDescription ? <section className="rounded-[10px] border border-stone-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Version description</p><textarea value={versionDescriptionDraft} onChange={(event) => setVersionDescriptionDraft(event.target.value)} className="mt-3 min-h-20 w-full rounded-[8px] border border-stone-200 px-3 py-2 text-sm" /><div className="mt-3 flex gap-2"><button type="button" onClick={() => setIsEditingVersionDescription(false)} className="rounded-[8px] px-3 py-2 text-sm font-semibold text-stone-700">Cancel</button><button type="button" onClick={saveVersionDescription} className="rounded-[8px] bg-stone-950 px-3 py-2 text-sm font-semibold text-white">Save description</button></div></section> : null}
          <p className="text-sm text-stone-500">{isCreator || review.shareSettings.allowComments ? 'Click anywhere on the preview to add a pinned comment.' : 'Deliverable discussion is disabled for this review.'}</p>

          <div className="flex min-h-[calc(100vh-220px)] flex-col pb-10">
            <div className="relative flex-1">
              {activeVersionHasPreview && (isCreator || review.shareSettings.allowComments) ? (
                <div className="sticky top-20 z-10 flex justify-end pr-2">
                  <button
                    type="button"
                    onClick={() => setShowPins((current) => !current)}
                    className="rounded-[8px] border border-stone-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-sm hover:bg-stone-50"
                  >
                    {showPins ? 'Hide pins' : 'Show pins'}
                  </button>
                </div>
              ) : null}
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
                      className={`flex h-full min-h-[360px] flex-col items-center justify-center rounded-[12px] border border-dashed p-6 text-center transition ${isDropTargetActive ? 'border-stone-950 bg-stone-200' : 'border-stone-300 bg-stone-100'}`}
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
                      scrollContainerRef={previewScrollRef}
                      overlay={activeVersionHasPreview && showPins && (isCreator || review.shareSettings.allowComments) ? (
                        <PinCommentLayer
                          asset={activeAsset}
                          version={activeVersion}
                          comments={review.comments}
                          onAddComment={handleAddComment}
                          activeCommentId={activeCommentId}
                          onSelectComment={(commentId) => {
                            setActiveCommentId(commentId);
                            setCommentFilter('all');
                            setOriginFilter('all');
                            setRightTab('notes');
                            setIsFeedbackDrawerOpen(true);
                          }}
                        />
                      ) : null}
                    />
                  )}
                </>
              ) : (
                <div className="flex min-h-[440px] items-center justify-center rounded-[12px] border border-dashed border-stone-300 bg-stone-50 text-center">
                  <p className="max-w-[240px] text-sm text-stone-600">This review has no deliverables yet.</p>
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
            {renderOutcomePanel()}
          </div>
        </section>
        </div>

        <aside
          ref={feedbackDrawerRef}
          className={`${isFeedbackDrawerOpen ? 'fixed inset-x-0 bottom-0 top-16 z-40 flex lg:static lg:inset-auto lg:z-auto' : 'hidden'} min-h-0 flex-col overflow-y-auto border-l border-stone-200 bg-white p-4 shadow-xl`}
          aria-hidden={!isFeedbackDrawerOpen}
        >
          <div className="flex items-center justify-between gap-3 border-b border-stone-200 pb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Review drawer</p>
              <p className="mt-1 text-sm font-semibold text-stone-950">Discussion to decision</p>
            </div>
            <button type="button" onClick={() => { setIsFeedbackDrawerOpen(false); setIsAssetPickerOpen(false); }} className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-stone-200 text-stone-600 hover:bg-stone-50" aria-label="Close feedback drawer">
              <FiX aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 space-y-4">{renderNotesPanel()}</div>
          {isCreator ? (
            <section ref={settingsSectionRef} className="mt-4 scroll-mt-4 border-t border-stone-200 pt-3">
              <p className="text-sm font-semibold text-stone-950">Creator settings</p>
              <div className="mt-3 grid gap-2">
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
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => openAuthModal('login')} className="rounded-[8px] border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">
                    Sign in
                  </button>
                  <button type="button" onClick={() => openAuthModal('signup')} className="rounded-[8px] bg-stone-950 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-800">
                    Create account
                  </button>
                </div>
              )}
            </section>
          ) : null}
          <div className="hidden">
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
            <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              <div className="sticky top-0 z-10 -mx-1 bg-white px-1 pb-2">
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
                <p className="mt-2 text-xs text-stone-500">{openCommentCount} open comments / {resolvedCommentCount} resolved across this review</p>
              </div>

              {filteredAssetComments.length > 0 ? filteredAssetComments.map((comment, index) => (
                <article
                  key={comment.id}
                  ref={(node) => {
                    commentCardRefs.current[comment.id] = node;
                  }}
                  className={`rounded-[10px] border px-3 py-2.5 text-sm ${activeCommentId === comment.id ? 'border-stone-950 bg-stone-950 text-white' : comment.status === 'resolved' ? 'border-stone-200 bg-stone-50 text-stone-500' : 'border-stone-200 bg-white text-stone-700'}`}
                >
                  <button type="button" onClick={() => focusComment(comment)} className="block w-full text-left">
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
              )) : !assetComments.length && commentsOutsideActiveVersion.length > 0 ? (
                <div className="rounded-[10px] border border-dashed border-stone-300 bg-stone-50 px-3 py-3 text-sm text-stone-600">
                  <p>No pinned notes on this version.</p>
                  <button
                    type="button"
                    onClick={() => focusComment(commentsOutsideActiveVersion[0])}
                    className="mt-2 rounded-[8px] bg-stone-950 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Show first note
                  </button>
                </div>
              ) : (
                <p className="rounded-[10px] border border-dashed border-stone-300 bg-stone-50 px-3 py-3 text-sm text-stone-600">{review.shareSettings.allowComments || isCreator ? 'Click the preview to add a pinned note.' : 'Comments are disabled for this review.'}</p>
              )}

              {commentsOutsideActiveVersion.length > 0 ? (
                <div className="rounded-[10px] border border-stone-200 bg-white px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Elsewhere in review</p>
                  <div className="mt-2 space-y-2">
                    {commentsOutsideActiveVersion.slice(0, 4).map((comment) => (
                      <button
                        key={comment.id}
                        type="button"
                        onClick={() => focusComment(comment)}
                        className="block w-full rounded-[8px] bg-stone-50 px-2.5 py-2 text-left text-xs text-stone-700 hover:bg-stone-100"
                      >
                        <span className="block font-semibold text-stone-950">{getCommentLocationLabel(comment)}</span>
                        <span className="mt-1 block truncate">{comment.text}</span>
                      </button>
                    ))}
                  </div>
                  {commentsOutsideActiveVersion.length > 4 ? (
                    <p className="mt-2 text-xs text-stone-500">+{commentsOutsideActiveVersion.length - 4} more on other deliverables or versions.</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
              <FeedbackPanel value={review.overallFeedback} onChange={handleFeedbackChange} label="Overall feedback" />
              {!isCreator && review.shareSettings.allowComments ? (
                <button type="button" onClick={handleSaveFeedback} className="mt-3 rounded-[8px] bg-stone-950 px-3 py-2 text-sm font-semibold text-white">Save feedback</button>
              ) : null}
              {!isCreator && !review.shareSettings.allowComments ? <p className="mt-3 text-sm text-stone-500">Feedback is disabled for this review.</p> : null}
            </div>
          )}

          <div className="mt-4 flex-none border-t border-stone-200 pt-4">
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
            <div className="mt-4 max-h-[34vh] flex-none overflow-y-auto border-t border-stone-200 pt-4 pr-1">
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
          </div>
        </aside>
        {!isFeedbackDrawerOpen ? renderFeedbackRail() : null}
      </div>

      <Suspense fallback={null}>
        <AuthModal defaultNext={pathname || '/dashboard'} />
      </Suspense>
    </main>
  );
}
