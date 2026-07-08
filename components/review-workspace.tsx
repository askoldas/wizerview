"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import { AssetSurface } from '@/components/asset-surface';
import { FeedbackPanel } from '@/components/feedback-panel';
import { PinCommentLayer } from '@/components/pin-comment-layer';
import { estimateStorageSavings, processImagePreview, processPdfPreview } from '@/lib/asset-processing';
import type { Asset, Comment, ReviewData, ReviewOption, ShareSettings } from '@/lib/mock-data';
import {
  createEmptyReviewData,
  loadReview,
  markReviewSeen,
  saveComment,
  saveReview,
  saveReviewerDecision,
  saveReviewerFeedback,
  type ReviewerDecisionType,
} from '@/lib/review-service';
import { createSupabaseClientInstance, isSupabaseConfigured } from '@/lib/supabase';

export type ReviewWorkspaceMode = 'creator' | 'client';

interface ReviewWorkspaceProps {
  mode: ReviewWorkspaceMode;
  reviewId: string;
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

export function ReviewWorkspace({ mode, reviewId, initialReview }: ReviewWorkspaceProps) {
  const isCreator = mode === 'creator';
  const supabase = useMemo(() => createSupabaseClientInstance(), []);
  const fallbackReview = useMemo(() => initialReview ?? createEmptyReviewData(reviewId), [initialReview, reviewId]);

  const [review, setReview] = useState<ReviewData>(fallbackReview);
  const [activeOptionId, setActiveOptionId] = useState(fallbackReview.options[0]?.id ?? '');
  const [activeAssetId, setActiveAssetId] = useState(fallbackReview.options[0]?.assets[0]?.id ?? '');
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [activePdfPage, setActivePdfPage] = useState(1);
  const [rightTab, setRightTab] = useState<'notes' | 'feedback'>('notes');
  const [showPins, setShowPins] = useState(true);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isReviewLoaded, setIsReviewLoaded] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [isSendingLogin, setIsSendingLogin] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(isCreator && Boolean(supabase));
  const [hasMarkedSeen, setHasMarkedSeen] = useState(false);
  const [reviewerName, setReviewerName] = useState('');
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [pendingComment, setPendingComment] = useState<{
    assetId: string;
    x: number;
    y: number;
    text: string;
    author: string;
  } | null>(null);

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

    loadReview(reviewId).then((loaded) => {
      if (ignored) return;
      const firstOption = loaded.options[0];

      setReview(loaded);
      setActiveOptionId(firstOption?.id ?? '');
      setActiveAssetId(firstOption?.assets[0]?.id ?? '');
      setActiveCommentId(null);
      setIsReviewLoaded(true);
    });

    return () => {
      ignored = true;
    };
  }, [reviewId]);

  const activeOption = review.options.find((option) => option.id === activeOptionId) ?? review.options[0];
  const activeOptionIndex = Math.max(0, review.options.findIndex((option) => option.id === activeOption?.id));
  const activeAsset = activeOption?.assets.find((asset) => asset.id === activeAssetId) ?? activeOption?.assets[0];
  const assetComments = review.comments.filter((comment) => comment.assetId === activeAsset?.id);
  const totalComments = review.comments.length;
  const hasMultipleVersions = review.options.length > 1;
  const shareLink = typeof window !== 'undefined' ? `${window.location.origin}/review/${review.id}` : `/review/${review.id}`;

  const shareSummary = useMemo(() => {
    const parts = [review.shareSettings.reviewerNameRequired ? 'name required' : 'name optional'];
    if (review.shareSettings.pinProtection) parts.push('PIN');
    if (review.shareSettings.allowComments) parts.push('comments');
    if (review.shareSettings.allowDecisions) parts.push('decisions');
    return parts.join(' / ');
  }, [review.shareSettings]);

  useEffect(() => {
    if (!activeOption) return;
    if (!activeOption.assets.some((asset) => asset.id === activeAssetId)) {
      setActiveAssetId(activeOption.assets[0]?.id ?? '');
      setActiveCommentId(null);
    }
  }, [activeAssetId, activeOption]);

  useEffect(() => {
    if (!isCreator || !isReviewLoaded) return;
    if (isCheckingAuth) return;
    if (isSupabaseConfigured() && !authUser) return;

    const timer = window.setTimeout(() => {
      saveReview(review).catch((error) => {
        setSaveMessage(error instanceof Error ? error.message : 'Autosave failed.');
      });
    }, 400);

    return () => window.clearTimeout(timer);
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
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      setSaveMessage(shareLink);
      return;
    }

    await navigator.clipboard.writeText(shareLink);
    setSaveMessage('Review link copied.');
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
      setSaveMessage('Saved.');
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Save failed.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendLoginLink = async () => {
    if (!supabase) {
      setAuthMessage('Add Supabase environment variables before signing in.');
      return;
    }

    setIsSendingLogin(true);
    setAuthMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: authEmail,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.href : undefined,
      },
    });

    setAuthMessage(error ? error.message : 'Check your email for the sign-in link.');
    setIsSendingLogin(false);
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setAuthUser(null);
    setSaveMessage(null);
  };

  const handleAssetUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeOption) return;

    if (isSupabaseConfigured() && !authUser) {
      setUploadMessage('Sign in before uploading optimized previews.');
      event.target.value = '';
      return;
    }

    const pendingAssetId = `asset-${Date.now()}`;
    const pendingAsset: Asset = {
      id: pendingAssetId,
      title: file.name.replace(/\.[^.]+$/, ''),
      kind: file.type === 'application/pdf' ? 'pdf' : 'screenshot',
      description: 'Preparing an optimized review preview.',
      accent: 'from-stone-700 via-stone-500 to-stone-200',
      notes: 'Processing preview...',
      status: 'processing',
      originalName: file.name,
      originalMimeType: file.type,
      originalBytes: file.size,
      storageHint: 'WizerView stores optimized review previews, not the original file.',
    };

    setReview((current) => ({
      ...current,
      options: current.options.map((option) => (option.id === activeOption.id ? { ...option, assets: [...option.assets, pendingAsset] } : option)),
    }));
    setActiveAssetId(pendingAssetId);
    setActivePdfPage(1);
    setUploadMessage(`Uploading ${file.name}...`);

    try {
      const processed = file.type === 'application/pdf' ? await processPdfPreview(file) : await processImagePreview(file);
      const nextAsset: Asset = {
        ...pendingAsset,
        title: processed.originalName.replace(/\.[^.]+$/, ''),
        kind: processed.kind === 'pdf' ? 'pdf' : 'screenshot',
        description: processed.storageHint,
        notes: `${processed.previewMimeType.toUpperCase()} preview / ${formatByteSize(processed.previewBytes)} / ${estimateStorageSavings(processed.originalBytes, processed.previewBytes)}% smaller`,
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
        width: processed.width,
        height: processed.height,
        pageCount: processed.pageCount,
        pageNumber: 1,
        storageHint: processed.storageHint,
      };

      setReview((current) => ({
        ...current,
        options: current.options.map((option) => (option.id === activeOption.id ? { ...option, assets: option.assets.map((asset) => (asset.id === pendingAssetId ? nextAsset : asset)) } : option)),
      }));
      setUploadMessage(`Original ${formatByteSize(processed.originalBytes)} -> Preview ${formatByteSize(processed.previewBytes)} ${processed.previewMimeType.toUpperCase()}`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Processing failed.';
      setReview((current) => ({
        ...current,
        options: current.options.map((option) => (option.id === activeOption.id ? { ...option, assets: option.assets.map((asset) => (asset.id === pendingAssetId ? { ...asset, status: 'failed', notes: reason, description: 'Processing failed.' } : asset)) } : option)),
      }));
      setUploadMessage(reason);
    } finally {
      event.target.value = '';
    }
  };

  const addVersion = () => {
    const nextIndex = review.options.length;
    const newOption: ReviewOption = {
      id: `option-${Date.now()}`,
      title: versionLabel(nextIndex),
      description: 'A parallel version for the reviewer to compare.',
      assets: [],
    };

    setReview((current) => ({
      ...current,
      options: [...current.options, newOption],
    }));
    setActiveOptionId(newOption.id);
    setActiveAssetId('');
    setActiveCommentId(null);
  };

  const addRelatedAsset = () => {
    if (!activeOption) return;
    const newAsset: Asset = {
      id: `asset-${Date.now()}`,
      title: 'Related asset',
      kind: 'screenshot',
      description: 'A new reviewable surface for this version.',
      accent: 'from-stone-700 via-stone-500 to-stone-200',
      notes: 'Ready for review.',
    };

    setReview((current) => ({
      ...current,
      options: current.options.map((option) => (option.id === activeOption.id ? { ...option, assets: [...option.assets, newAsset] } : option)),
    }));
    setActiveAssetId(newAsset.id);
    setActiveCommentId(null);
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

  const handleAddComment = (assetId: string, x: number, y: number, text: string, author: string) => {
    if (!requireName()) {
      setPendingComment({ assetId, x, y, text, author });
      return;
    }

    persistComment({
      id: `comment-${Date.now()}`,
      assetId,
      x,
      y,
      text,
      author: isCreator ? 'Creator' : author || reviewerName || 'Reviewer',
    });
    setPendingComment(null);
  };

  const handleNameSubmit = () => {
    if (!reviewerName.trim()) return;
    setShowIdentityModal(false);

    if (pendingComment) {
      const { assetId, x, y, text, author } = pendingComment;
      setPendingComment(null);
      handleAddComment(assetId, x, y, text, author);
    }
  };

  const handleFeedbackChange = (value: string) => {
    if (!requireName()) return;
    setReview((current) => ({ ...current, overallFeedback: value }));
  };

  const handleSaveFeedback = async () => {
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

  const persistDecision = async (type: ReviewerDecisionType, note: string, optionId?: string | null) => {
    try {
      await saveReviewerDecision({
        reviewId: review.id,
        optionId: optionId ?? null,
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
    if (!requireName() || !activeOption) return;
    const note = `Selected version: ${versionLabel(activeOptionIndex)}`;
    setReview((current) => ({ ...current, selectedDirection: activeOption.id, decision: note }));
    void persistDecision('direction_selected', note, activeOption.id);
  };

  const handleDecisionChange = (decision: string, type: ReviewerDecisionType) => {
    if (!requireName()) return;
    setReview((current) => ({ ...current, decision }));
    void persistDecision(type, decision, null);
  };

  const renderAssetRailButton = (asset: Asset) => (
    <button
      key={asset.id}
      type="button"
      onClick={() => {
        setActiveAssetId(asset.id);
        setActiveCommentId(null);
      }}
      className={`group w-full rounded-[10px] border p-2 text-left transition ${activeAsset?.id === asset.id ? 'border-stone-950 bg-white shadow-sm' : 'border-transparent bg-stone-100/70 hover:bg-white'}`}
    >
      <div className={`flex h-20 items-center justify-center rounded-[8px] bg-gradient-to-br ${asset.accent ?? 'from-stone-700 via-stone-500 to-stone-200'} text-[10px] font-semibold uppercase tracking-[0.18em] text-white`}>
        {asset.thumbnailUrl || asset.previewUrl ? (
          <img src={asset.thumbnailUrl ?? asset.previewUrl} alt="" className="h-full w-full rounded-[8px] object-cover" />
        ) : (
          asset.kind
        )}
      </div>
      <div className="mt-2 flex items-start justify-between gap-2">
        <span className="text-xs font-semibold leading-4 text-stone-900">{asset.title}</span>
        {isCreator ? <span className="text-stone-400">...</span> : null}
      </div>
    </button>
  );

  return (
    <main className="flex min-h-screen flex-col bg-[#f5f3ee] text-stone-950">
      {showIdentityModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 px-4">
          <div className="w-full max-w-md rounded-[14px] border border-stone-200 bg-white p-6 shadow-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-stone-500">Reviewer access</p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-900">Before feedback, tell us who you are</h2>
            <p className="mt-3 text-sm text-stone-600">This keeps comments and decisions attached to the right reviewer without needing an account.</p>

            {review.shareSettings.pinProtection ? (
              <div className="mt-4 rounded-[12px] border border-stone-200 bg-stone-50 p-4">
                <label className="block text-sm font-medium text-stone-700">PIN (demo only)</label>
                <input className="mt-2 w-full rounded-[10px] border border-stone-200 bg-white px-3 py-2.5 text-sm" placeholder="1234" />
              </div>
            ) : null}

            <label className="mt-4 block text-sm font-medium text-stone-700">Reviewer name</label>
            <input
              value={reviewerName}
              onChange={(event) => setReviewerName(event.target.value)}
              placeholder="Alex Morgan"
              className="mt-2 w-full rounded-[10px] border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm"
            />
            <button type="button" onClick={handleNameSubmit} className="mt-5 rounded-[10px] bg-stone-950 px-4 py-2 text-sm font-semibold text-white">
              Continue to review
            </button>
          </div>
        </div>
      ) : null}

      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur lg:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <Link href="/" className="text-base font-semibold tracking-tight text-stone-950">WizerView</Link>
            <span className="h-5 w-px bg-stone-200" />
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">{isCreator ? 'Creator workspace' : 'Client review'}</span>
            <h1 className="min-w-0 text-sm font-semibold text-stone-950 sm:text-base">{review.title}</h1>
            {saveMessage ? <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600">{saveMessage}</span> : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isCreator ? (
              <>
                <Link href={`/review/${review.id}`} className="rounded-[8px] border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">Preview client view</Link>
                <button type="button" onClick={() => void copyReviewLink()} className="rounded-[8px] border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">Copy review link</button>
                <button type="button" onClick={handleSaveReview} disabled={isSaving || isCheckingAuth || (isSupabaseConfigured() && !authUser)} className="rounded-[8px] bg-stone-950 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60">
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <div className="rounded-[8px] bg-stone-100 px-3 py-2 text-sm text-stone-600">{authUser?.email ?? 'Not signed in'}</div>
              </>
            ) : (
              <>
                <div className="rounded-[8px] bg-stone-100 px-3 py-2 text-sm text-stone-600">{review.client || 'Client'}</div>
                <input value={reviewerName} onChange={(event) => setReviewerName(event.target.value)} placeholder="Your name" className="w-40 rounded-[8px] border border-stone-200 bg-white px-3 py-2 text-sm" />
              </>
            )}
          </div>
        </div>
      </header>

      <div className="grid flex-1 lg:grid-cols-[156px_minmax(0,1fr)_360px]">
        <aside className="border-b border-stone-200 bg-stone-50/80 p-3 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">Assets</p>
            {isCreator ? (
              <button type="button" onClick={addRelatedAsset} className="rounded-[8px] border border-stone-200 bg-white px-2 py-1 text-xs font-semibold text-stone-700">Add</button>
            ) : null}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-1">
            {activeOption?.assets.length ? activeOption.assets.map(renderAssetRailButton) : (
              <div className="rounded-[10px] border border-dashed border-stone-300 bg-white p-3 text-xs leading-5 text-stone-500">No assets in this version yet.</div>
            )}
          </div>
          {isCreator ? (
            <label className={`mt-3 flex cursor-pointer justify-center rounded-[8px] bg-stone-950 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-800 ${isSupabaseConfigured() && !authUser ? 'cursor-not-allowed opacity-60' : ''}`}>
              Upload
              <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="sr-only" onChange={handleAssetUpload} disabled={isSupabaseConfigured() && !authUser} />
            </label>
          ) : null}
          {uploadMessage ? <p className="mt-3 text-xs leading-5 text-stone-500">{uploadMessage}</p> : null}
        </aside>

        <section className="min-w-0 px-4 py-4 lg:px-6">
          <div className="flex flex-col gap-3 border-b border-stone-200 pb-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {review.options.map((option, index) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setActiveOptionId(option.id);
                    setActiveAssetId(option.assets[0]?.id ?? '');
                    setActiveCommentId(null);
                  }}
                  className={`rounded-[8px] px-3 py-2 text-sm font-semibold ${activeOption?.id === option.id ? 'bg-stone-950 text-white' : 'bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50'}`}
                >
                  {versionLabel(index)}
                </button>
              ))}
              {isCreator ? (
                <button type="button" onClick={addVersion} className="rounded-[8px] border border-dashed border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">+ Add version</button>
              ) : null}
            </div>
            <p className="text-sm text-stone-500">Click the preview to add a pinned note.</p>
          </div>

          <div className="mt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-stone-950">{versionLabel(activeOptionIndex)}</p>
                <p className="text-sm text-stone-600">{activeOption?.description ?? 'A preview-ready surface for the reviewer.'}</p>
              </div>
              {!isCreator && hasMultipleVersions ? (
                <button type="button" onClick={handleSelectVersion} className="rounded-[8px] bg-stone-950 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-800">Select this version</button>
              ) : null}
            </div>

            <div className="relative min-h-[470px] overflow-hidden rounded-[14px] border border-stone-200 bg-white/75 p-3 shadow-sm">
              {activeAsset ? (
                <>
                  <AssetSurface asset={activeAsset} />
                  {showPins ? (
                    <PinCommentLayer
                      asset={activeAsset}
                      comments={review.comments}
                      onAddComment={handleAddComment}
                      activeCommentId={activeCommentId}
                      onSelectComment={setActiveCommentId}
                    />
                  ) : null}
                </>
              ) : (
                <div className="flex min-h-[440px] items-center justify-center rounded-[12px] border border-dashed border-stone-300 bg-stone-50 text-center">
                  <p className="max-w-[240px] text-sm text-stone-600">This version has no assets yet.</p>
                </div>
              )}
            </div>

            {activeAsset?.kind === 'pdf' && activeAsset.pageCount ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {Array.from({ length: activeAsset.pageCount }, (_, index) => (
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
              {assetComments.length > 0 ? assetComments.map((comment, index) => (
                <button
                  key={comment.id}
                  type="button"
                  onClick={() => setActiveCommentId(comment.id)}
                  className={`w-full rounded-[10px] border px-3 py-2.5 text-left text-sm ${activeCommentId === comment.id ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{comment.author}</span>
                    <span className="text-xs uppercase tracking-[0.18em]">Pin {index + 1}</span>
                  </div>
                  <p className="mt-1 text-sm">{comment.text}</p>
                  {isCreator ? (
                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <span className="rounded-full bg-white/20 px-2 py-1">Open</span>
                      <span>Resolve</span>
                      <span>Reply</span>
                    </div>
                  ) : null}
                </button>
              )) : (
                <p className="rounded-[10px] border border-dashed border-stone-300 bg-stone-50 px-3 py-3 text-sm text-stone-600">Click the preview to add a pinned note.</p>
              )}
            </div>
          ) : (
            <div className="mt-4">
              <FeedbackPanel value={review.overallFeedback} onChange={handleFeedbackChange} label="Overall feedback" />
              {!isCreator ? (
                <button type="button" onClick={handleSaveFeedback} className="mt-3 rounded-[8px] bg-stone-950 px-3 py-2 text-sm font-semibold text-white">Save feedback</button>
              ) : null}
            </div>
          )}

          <div className="mt-5 border-t border-stone-200 pt-5">
            <p className="text-sm font-semibold text-stone-950">Final decision</p>
            {!isCreator ? (
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
            ) : (
              <p className="mt-2 text-sm text-stone-600">{review.decision || 'Awaiting client decision.'}</p>
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
                  <input type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="you@example.com" className="rounded-[8px] border border-stone-200 px-3 py-2 text-sm" />
                  <button type="button" onClick={handleSendLoginLink} disabled={isSendingLogin || !authEmail} className="rounded-[8px] border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700 disabled:opacity-60">
                    {isSendingLogin ? 'Sending...' : 'Email sign-in link'}
                  </button>
                  {authMessage ? <p className="text-xs text-stone-500">{authMessage}</p> : null}
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
              <button type="button" className="rounded-[8px] border border-stone-200 px-3 py-1.5 font-semibold text-stone-700">Finish review</button>
              <button type="button" onClick={() => void copyReviewLink()} className="rounded-[8px] bg-stone-950 px-3 py-1.5 font-semibold text-white">Share</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setRightTab('feedback')} className="rounded-[8px] border border-stone-200 px-3 py-1.5 font-semibold text-stone-700">Add general comment</button>
              <button type="button" className="rounded-[8px] border border-stone-200 px-3 py-1.5 font-semibold text-stone-700">Download</button>
              <button type="button" onClick={() => void copyReviewLink()} className="rounded-[8px] bg-stone-950 px-3 py-1.5 font-semibold text-white">Share review link</button>
            </>
          )}
        </div>
      </footer>
    </main>
  );
}
