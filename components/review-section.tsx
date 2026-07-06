"use client";

import { AssetSurface } from '@/components/asset-surface';
import { FeedbackPanel } from '@/components/feedback-panel';
import { OptionCard } from '@/components/option-card';
import { PinCommentLayer } from '@/components/pin-comment-layer';
import type { Asset, Comment, ReviewSection } from '@/lib/mock-data';

interface ReviewSectionProps {
  section: ReviewSection;
  comments: Comment[];
  onAddComment: (assetId: string, x: number, y: number, text: string, author: string) => void;
  onSelectOption: (optionId: string) => void;
  onSectionFeedbackChange: (value: string) => void;
  onOptionFeedbackChange: (optionId: string, value: string) => void;
  sectionFeedback: string;
  optionFeedback: Record<string, string>;
  selectedDirection: string | null;
}

export function ReviewSection({
  section,
  comments,
  onAddComment,
  onSelectOption,
  onSectionFeedbackChange,
  onOptionFeedbackChange,
  sectionFeedback,
  optionFeedback,
  selectedDirection,
}: ReviewSectionProps) {
  if (section.type === 'compare-options' && section.options) {
    return (
      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-stone-500">Section</p>
            <h3 className="text-xl font-semibold text-stone-900">{section.title}</h3>
          </div>
          <p className="max-w-xl text-sm text-stone-600">{section.intro}</p>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {section.options.map((option) => (
            <OptionCard
              key={option.id}
              option={option}
              comments={comments}
              onAddComment={onAddComment}
              onSelectOption={onSelectOption}
              onOptionFeedbackChange={onOptionFeedbackChange}
              optionFeedback={optionFeedback[option.id] ?? ''}
              selectedDirection={selectedDirection}
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-stone-500">Section</p>
          <h3 className="text-xl font-semibold text-stone-900">{section.title}</h3>
        </div>
        <p className="max-w-xl text-sm text-stone-600">{section.intro}</p>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          {(section.assets ?? []).map((asset) => (
            <div key={asset.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-stone-800">{asset.title}</p>
                  <p className="text-sm text-stone-600">{asset.description}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
                  {asset.kind}
                </span>
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white">
                <AssetSurface asset={asset} />
                <PinCommentLayer asset={asset} comments={comments} onAddComment={onAddComment} />
              </div>
            </div>
          ))}
        </div>
        <FeedbackPanel value={sectionFeedback} onChange={onSectionFeedbackChange} label="Section feedback" />
      </div>
    </section>
  );
}
