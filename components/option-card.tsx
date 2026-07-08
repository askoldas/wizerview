"use client";

import { AssetSurface } from '@/components/asset-surface';
import { FeedbackPanel } from '@/components/feedback-panel';
import { PinCommentLayer } from '@/components/pin-comment-layer';
import type { Asset, Comment } from '@/lib/mock-data';

interface OptionCardProps {
  option: {
    id: string;
    title: string;
    description: string;
    assets: Asset[];
  };
  comments: Comment[];
  onAddComment: (assetId: string, x: number, y: number, text: string, author: string) => void;
  onSelectOption: (optionId: string) => void;
  onOptionFeedbackChange: (optionId: string, value: string) => void;
  optionFeedback: string;
  selectedDirection: string | null;
}

export function OptionCard({ option, comments, onAddComment, onSelectOption, onOptionFeedbackChange, optionFeedback, selectedDirection }: OptionCardProps) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-lg font-semibold text-stone-900">{option.title}</h4>
          <p className="mt-1 text-sm text-stone-600">{option.description}</p>
        </div>
        <button
          onClick={() => onSelectOption(option.id)}
          className={`rounded-full px-3 py-2 text-sm font-medium ${selectedDirection === option.id ? 'bg-stone-900 text-white' : 'bg-white text-stone-700'}`}
        >
          {selectedDirection === option.id ? 'Selected' : 'Select this version'}
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {option.assets.map((asset) => (
          <div key={asset.id} className="rounded-2xl border border-stone-200 bg-white p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-stone-800">{asset.title}</p>
              <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-stone-500">
                {asset.kind}
              </span>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
              <AssetSurface asset={asset} />
              <PinCommentLayer asset={asset} comments={comments} onAddComment={onAddComment} activeCommentId={null} onSelectComment={() => {}} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <FeedbackPanel value={optionFeedback} onChange={(value) => onOptionFeedbackChange(option.id, value)} label="Version feedback" />
      </div>
    </div>
  );
}
