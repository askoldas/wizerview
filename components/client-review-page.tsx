"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AssetSurface } from '@/components/asset-surface';
import { FeedbackPanel } from '@/components/feedback-panel';
import { PinCommentLayer } from '@/components/pin-comment-layer';
import { type Comment, type ReviewData } from '@/lib/mock-data';
import { createEmptyReviewData, loadReview, saveComment } from '@/lib/review-service';

interface ClientReviewPageProps {
  reviewId: string;
}

export function ClientReviewPage({ reviewId }: ClientReviewPageProps) {
  const reviewData = createEmptyReviewData(reviewId);
  const [reviewState, setReviewState] = useState<ReviewData>(reviewData);
  const [reviewerName, setReviewerName] = useState('');
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [pendingComment, setPendingComment] = useState<{
    assetId: string;
    x: number;
    y: number;
    text: string;
    author: string;
  } | null>(null);
  const [activeOptionId, setActiveOptionId] = useState(reviewData.options[0]?.id ?? '');
  const [activeAssetId, setActiveAssetId] = useState(reviewData.options[0]?.assets[0]?.id ?? '');
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);

  useEffect(() => {
    let ignored = false;
    loadReview(reviewId).then((loaded) => {
      if (ignored) return;

      setReviewState(loaded);
      const firstOption = loaded.options[0];
      setActiveOptionId(firstOption?.id ?? '');
      setActiveAssetId(firstOption?.assets[0]?.id ?? '');
      setActiveCommentId(null);
    });

    return () => {
      ignored = true;
    };
  }, [reviewId]);

  const activeOption = reviewState.options.find((option) => option.id === activeOptionId) ?? reviewState.options[0];
  const activeAsset = activeOption?.assets.find((asset) => asset.id === activeAssetId) ?? activeOption?.assets[0];
  const assetComments = reviewState.comments.filter((comment) => comment.assetId === activeAsset?.id);
  const isComparisonReview = reviewState.options.length > 1;

  useEffect(() => {
    if (!activeOption) return;
    if (!activeOption.assets.some((asset) => asset.id === activeAssetId)) {
      setActiveAssetId(activeOption.assets[0]?.id ?? '');
    }
  }, [activeAssetId, activeOption]);

  const requireName = () => {
    if (!reviewerName.trim()) {
      setShowIdentityModal(true);
      return false;
    }
    return true;
  };

  const handleAddComment = (assetId: string, x: number, y: number, text: string, author: string) => {
    if (!requireName()) {
      setPendingComment({ assetId, x, y, text, author });
      return;
    }

    const comment: Comment = {
      id: `comment-${Date.now()}`,
      assetId,
      x,
      y,
      text,
      author: author || reviewerName,
    };

    setPendingComment(null);
    setReviewState((current) => {
      const nextReview = { ...current, comments: [...current.comments, comment] };
      void saveComment(nextReview, comment);
      return nextReview;
    });
    setActiveCommentId(comment.id);
  };

  const handleFeedbackChange = (value: string) => {
    if (!requireName()) return;
    setReviewState((current) => ({ ...current, overallFeedback: value }));
  };

  const handlePreferOption = (optionId: string) => {
    if (!requireName()) return;
    const selectedOption = reviewState.options.find((option) => option.id === optionId);
    if (!selectedOption) return;
    setReviewState((current) => ({ ...current, selectedDirection: optionId, decision: `Preferred option: ${selectedOption.title}` }));
  };

  const handleFinalizeDirection = () => {
    if (!requireName()) return;
    if (!activeOption) return;
    setReviewState((current) => ({ ...current, decision: `Selected direction: ${activeOption.title}` }));
  };

  const handleDecisionChange = (decision: string) => {
    if (!requireName()) return;
    setReviewState((current) => ({ ...current, decision }));
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

  return (
    <main className="min-h-screen bg-[#f5f3ee]">
      {showIdentityModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 px-4">
          <div className="w-full max-w-md rounded-[14px] border border-stone-200 bg-white p-6 shadow-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-stone-500">Reviewer access</p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-900">Before feedback, tell us who you are</h2>
            <p className="mt-3 text-sm text-stone-600">This keeps comments and decisions attached to the right reviewer without needing an account.</p>

            {reviewState.shareSettings.pinProtection ? (
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
            <button onClick={handleNameSubmit} className="mt-5 rounded-[10px] bg-stone-950 px-4 py-2 text-sm font-semibold text-white">
              Continue to review
            </button>
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 lg:px-8">
        <header className="rounded-[14px] border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-stone-500">Client review</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">{reviewState.title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">{reviewState.instructions}</p>
            </div>
            <div className="rounded-[10px] bg-stone-100 px-3 py-2 text-sm font-medium text-stone-600">{reviewState.client}</div>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[14px] border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {reviewState.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    setActiveOptionId(option.id);
                    setActiveAssetId(option.assets[0]?.id ?? '');
                    setActiveCommentId(null);
                  }}
                  className={`rounded-[10px] px-3 py-2 text-sm font-semibold ${activeOption?.id === option.id ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}
                >
                  {option.title}
                </button>
              ))}
            </div>

            <div className="mt-4 overflow-hidden rounded-[12px] border border-stone-200 bg-[#f7f6f2] p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-stone-950">{activeOption?.title ?? 'Current option'}</p>
                  <p className="text-sm text-stone-600">{activeOption?.description}</p>
                </div>
                {isComparisonReview ? (
                  <button onClick={() => handlePreferOption(activeOption?.id ?? '')} className="rounded-[10px] border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700 shadow-sm hover:bg-stone-50">
                    Prefer this option
                  </button>
                ) : null}
              </div>

              <div className="relative overflow-hidden rounded-[12px] border border-stone-200 bg-white p-3 shadow-sm">
                {activeAsset ? (
                  <>
                    <AssetSurface asset={activeAsset} />
                    <PinCommentLayer
                      asset={activeAsset}
                      comments={reviewState.comments}
                      onAddComment={handleAddComment}
                      activeCommentId={activeCommentId}
                      onSelectComment={setActiveCommentId}
                    />
                  </>
                ) : (
                  <div className="flex min-h-[360px] items-center justify-center rounded-[12px] border border-dashed border-stone-300 text-center">
                    <p className="max-w-[220px] text-sm text-stone-600">This option has no assets yet.</p>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {activeOption?.assets.map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => {
                      setActiveAssetId(asset.id);
                      setActiveCommentId(null);
                    }}
                    className={`rounded-[10px] px-3 py-2 text-sm font-semibold ${activeAsset?.id === asset.id ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}
                  >
                    {asset.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[14px] border border-stone-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-stone-500">Comments</p>
              <h2 className="mt-1 text-base font-semibold text-stone-900">Pinned notes for this asset</h2>
              <div className="mt-4 space-y-2">
                {assetComments.length > 0 ? (
                  assetComments.map((comment, index) => (
                    <button
                      key={comment.id}
                      onClick={() => setActiveCommentId(comment.id)}
                      className={`w-full rounded-[10px] border px-3 py-2.5 text-left text-sm ${activeCommentId === comment.id ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{comment.author}</span>
                        <span className="text-xs uppercase tracking-[0.2em]">Pin {index + 1}</span>
                      </div>
                      <p className="mt-1 text-sm">{comment.text}</p>
                    </button>
                  ))
                ) : (
                  <p className="rounded-[10px] border border-dashed border-stone-300 bg-stone-50 px-3 py-3 text-sm text-stone-600">Click the preview to add a pinned note.</p>
                )}
              </div>
            </div>

            <div className="rounded-[14px] border border-stone-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-stone-500">Feedback</p>
              <FeedbackPanel value={reviewState.overallFeedback} onChange={handleFeedbackChange} label="Overall feedback" />
            </div>

            <div className="rounded-[14px] border border-stone-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-stone-500">Decision</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {isComparisonReview ? (
                  <>
                    <button onClick={handleFinalizeDirection} className="rounded-[10px] bg-stone-950 px-3 py-2 text-sm font-semibold text-white">
                      Select {activeOption?.title ?? 'this option'}
                    </button>
                    <button onClick={() => handleDecisionChange('Suggest combining options')} className="rounded-[10px] border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700">
                      Suggest combining options
                    </button>
                  </>
                ) : (
                  <button onClick={() => handleDecisionChange('Approve')} className="rounded-[10px] bg-stone-950 px-3 py-2 text-sm font-semibold text-white">
                    Approve
                  </button>
                )}
                <button onClick={() => handleDecisionChange('Request changes')} className="rounded-[10px] border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700">
                  Request changes
                </button>
              </div>

              {reviewState.decision ? (
                <div className="mt-3 rounded-[10px] border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                  {reviewState.decision}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
