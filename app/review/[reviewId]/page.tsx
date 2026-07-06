"use client";

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useMemo, useState } from 'react';
import { DecisionBar } from '@/components/decision-bar';
import { FeedbackPanel } from '@/components/feedback-panel';
import { ReviewSection } from '@/components/review-section';
import { initialReview, type Comment, type ReviewData } from '@/lib/mock-data';

interface ClientReviewPageProps {
  params: { reviewId: string };
}

export default function ClientReviewPage({ params }: ClientReviewPageProps) {
  const review = useMemo<ReviewData>(() => {
    if (params.reviewId !== initialReview.id) return notFound();
    return initialReview;
  }, [params.reviewId]);

  const [reviewState, setReviewState] = useState<ReviewData>(review);
  const [reviewerName, setReviewerName] = useState('');
  const [showIdentityModal, setShowIdentityModal] = useState(true);
  const [pinPrompt, setPinPrompt] = useState(reviewState.shareSettings.pinProtection);

  const handleAddComment = (assetId: string, x: number, y: number, text: string, author: string) => {
    if (!reviewerName.trim()) {
      setShowIdentityModal(true);
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

    setReviewState((current) => ({ ...current, comments: [...current.comments, comment] }));
  };

  const handleDecisionChange = (decision: string) => {
    if (!reviewerName.trim()) {
      setShowIdentityModal(true);
      return;
    }
    setReviewState((current) => ({ ...current, decision }));
  };

  const handleNameSubmit = () => {
    if (!reviewerName.trim()) return;
    setShowIdentityModal(false);
  };

  const handleSectionFeedbackChange = (sectionId: string, value: string) => {
    if (!reviewerName.trim()) {
      setShowIdentityModal(true);
      return;
    }
    setReviewState((current) => ({ ...current, sectionFeedback: { ...current.sectionFeedback, [sectionId]: value } }));
  };

  const handleOptionFeedbackChange = (optionId: string, value: string) => {
    if (!reviewerName.trim()) {
      setShowIdentityModal(true);
      return;
    }
    setReviewState((current) => ({ ...current, optionFeedback: { ...current.optionFeedback, [optionId]: value } }));
  };

  const handleSelectDirection = (optionId: string) => {
    if (!reviewerName.trim()) {
      setShowIdentityModal(true);
      return;
    }
    setReviewState((current) => ({ ...current, selectedDirection: optionId }));
  };

  const handleOverallFeedbackChange = (value: string) => {
    if (!reviewerName.trim()) {
      setShowIdentityModal(true);
      return;
    }
    setReviewState((current) => ({ ...current, overallFeedback: value }));
  };

  return (
    <main className="min-h-screen bg-stone-100">
      {showIdentityModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 px-4">
          <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-xl">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-stone-500">Reviewer access</p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-900">Before feedback, tell us who you are</h2>
            <p className="mt-3 text-sm text-stone-600">This keeps comments and decisions attached to the right reviewer without requiring an account.</p>

            {reviewState.shareSettings.pinProtection ? (
              <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <label className="block text-sm font-medium text-stone-700">PIN (demo only)</label>
                <input className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-3 py-3 text-sm outline-none" placeholder="1234" />
              </div>
            ) : null}

            <label className="mt-4 block text-sm font-medium text-stone-700">Reviewer name</label>
            <input
              value={reviewerName}
              onChange={(event) => setReviewerName(event.target.value)}
              placeholder="Alex Morgan"
              className="mt-2 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm outline-none"
            />
            <button onClick={handleNameSubmit} className="mt-5 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white">
              Continue to review
            </button>
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8 lg:px-10">
        <header className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-stone-500">Client review</p>
              <h1 className="mt-2 text-3xl font-semibold text-stone-900">{reviewState.title}</h1>
              <p className="mt-3 max-w-2xl text-sm text-stone-600">{reviewState.instructions}</p>
            </div>
            <Link href="/" className="inline-flex rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">
              Back to dashboard
            </Link>
          </div>
        </header>

        <div className="space-y-6">
          {reviewState.sections.map((section) => (
            <ReviewSection
              key={section.id}
              section={section}
              comments={reviewState.comments}
              onAddComment={handleAddComment}
              onSelectOption={handleSelectDirection}
              onSectionFeedbackChange={(value) => handleSectionFeedbackChange(section.id, value)}
              onOptionFeedbackChange={handleOptionFeedbackChange}
              sectionFeedback={reviewState.sectionFeedback[section.id] ?? ''}
              optionFeedback={reviewState.optionFeedback}
              selectedDirection={reviewState.selectedDirection}
            />
          ))}
        </div>

        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-stone-900">Overall feedback</h2>
          <p className="mt-2 text-sm text-stone-600">Capture the final call before wrapping up the review.</p>
          <FeedbackPanel value={reviewState.overallFeedback} onChange={handleOverallFeedbackChange} label="Overall feedback" />
          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={() => handleDecisionChange('Approve')} className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white">
              Approve
            </button>
            <button onClick={() => handleDecisionChange('Request changes')} className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700">
              Request changes
            </button>
          </div>
        </section>

        <DecisionBar decision={reviewState.decision} onDecisionChange={handleDecisionChange} />

        {reviewState.decision ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-700 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-[0.3em]">Decision recorded</p>
            <h3 className="mt-2 text-xl font-semibold">{reviewState.decision}</h3>
            <p className="mt-2 text-sm">Comments stay visible alongside the chosen direction so the review remains easy to follow.</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
