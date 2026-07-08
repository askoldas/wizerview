"use client";

import { useState, type MouseEvent } from 'react';
import type { AssetVersion, Comment, ReviewAsset } from '@/lib/mock-data';

interface PinCommentLayerProps {
  asset: ReviewAsset;
  version?: AssetVersion;
  comments: Comment[];
  onAddComment: (assetId: string, assetVersionId: string, x: number, y: number, text: string, author: string) => void;
  activeCommentId: string | null;
  onSelectComment: (commentId: string | null) => void;
}

export function PinCommentLayer({ asset, version, comments, onAddComment, activeCommentId, onSelectComment }: PinCommentLayerProps) {
  const [draftText, setDraftText] = useState('');
  const [activePin, setActivePin] = useState<{ x: number; y: number } | null>(null);

  const handleAddPin = (event: MouseEvent<HTMLDivElement>) => {
    if (!version) return;
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setActivePin({ x, y });
  };

  const handleSave = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!version || !activePin || !draftText.trim()) return;
    onAddComment(asset.id, version.id, activePin.x, activePin.y, draftText.trim(), '');
    setDraftText('');
    setActivePin(null);
  };

  return (
    <div className="absolute inset-0 cursor-crosshair" onClick={handleAddPin}>
      {comments
        .filter((comment) => comment.assetId === asset.id && comment.assetVersionId === version?.id && !comment.parentCommentId && comment.x != null && comment.y != null)
        .map((comment, index) => (
          <button
            key={comment.id}
            className={`absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white text-sm font-semibold text-white shadow-lg ${activeCommentId === comment.id ? 'bg-stone-950 ring-2 ring-amber-300' : 'bg-amber-600'}`}
            style={{ left: `${comment.x ?? 0}%`, top: `${comment.y ?? 0}%` }}
            onClick={(event) => {
              event.stopPropagation();
              onSelectComment(comment.id);
            }}
          >
            {index + 1}
          </button>
        ))}

      {activePin ? (
        <div className="absolute left-4 top-4 w-72 rounded-[12px] border border-stone-200 bg-white p-3 shadow-xl">
          <p className="text-sm font-semibold text-stone-950">Add a pinned note</p>
          <textarea
            value={draftText}
            onChange={(event) => setDraftText(event.target.value)}
            placeholder="Leave a note about this version"
            className="mt-2 min-h-20 w-full rounded-[10px] border border-stone-200 px-3 py-2 text-sm"
          />
          <button onClick={handleSave} className="mt-3 rounded-[10px] bg-stone-950 px-3 py-2 text-sm font-semibold text-white">
            Save note
          </button>
        </div>
      ) : null}
    </div>
  );
}
