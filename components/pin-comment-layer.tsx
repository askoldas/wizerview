"use client";

import { useState } from 'react';
import type { Asset, Comment } from '@/lib/mock-data';

interface PinCommentLayerProps {
  asset: Asset;
  comments: Comment[];
  onAddComment: (assetId: string, x: number, y: number, text: string, author: string) => void;
}

export function PinCommentLayer({ asset, comments, onAddComment }: PinCommentLayerProps) {
  const [draftText, setDraftText] = useState('');
  const [draftAuthor, setDraftAuthor] = useState('');
  const [activePin, setActivePin] = useState<{ x: number; y: number } | null>(null);

  const handleAddPin = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setActivePin({ x, y });
  };

  const handleSave = () => {
    if (!activePin || !draftText.trim()) return;
    onAddComment(asset.id, activePin.x, activePin.y, draftText.trim(), draftAuthor.trim() || 'Reviewer');
    setDraftText('');
    setDraftAuthor('');
    setActivePin(null);
  };

  return (
    <div className="absolute inset-0" onClick={handleAddPin}>
      {comments
        .filter((comment) => comment.assetId === asset.id)
        .map((comment, index) => (
          <button
            key={comment.id}
            className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-stone-900 text-sm font-semibold text-white"
            style={{ left: `${comment.x}%`, top: `${comment.y}%` }}
            onClick={(event) => event.stopPropagation()}
          >
            {index + 1}
          </button>
        ))}

      {activePin ? (
        <div className="absolute left-4 top-4 w-64 rounded-2xl border border-stone-200 bg-white p-3 shadow-lg">
          <p className="text-sm font-semibold text-stone-900">Add a pinned note</p>
          <input
            value={draftAuthor}
            onChange={(event) => setDraftAuthor(event.target.value)}
            placeholder="Your name"
            className="mt-2 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none"
          />
          <textarea
            value={draftText}
            onChange={(event) => setDraftText(event.target.value)}
            placeholder="Leave a note about this surface"
            className="mt-2 min-h-20 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none"
          />
          <button onClick={handleSave} className="mt-3 rounded-full bg-stone-900 px-3 py-2 text-sm font-medium text-white">
            Save note
          </button>
        </div>
      ) : null}
    </div>
  );
}
