"use client";

import { useState, type MouseEvent } from 'react';
import type { AssetVersion, Comment, ReviewAsset } from '@/lib/mock-data';

interface PinCommentLayerProps {
  asset: ReviewAsset;
  version?: AssetVersion;
  comments: Comment[];
  onAddComment: (assetId: string, assetVersionId: string, x: number, y: number, text: string, author: string, pageNumber?: number) => void;
  activeCommentId: string | null;
  onSelectComment: (commentId: string | null) => void;
  pageNumber?: number;
}

function commentMatchesVersion(comment: Comment, asset: ReviewAsset, version?: AssetVersion) {
  if (!version || comment.assetId !== asset.id) return false;
  if (comment.assetVersionId === version.id) return true;

  const legacyOptionId = typeof version.metadata?.legacyOptionId === 'string' ? version.metadata.legacyOptionId : null;
  if (legacyOptionId && (comment.assetVersionId === legacyOptionId || comment.optionId === legacyOptionId)) return true;

  return asset.versions.length <= 1 && !comment.assetVersionId && !comment.optionId;
}

export function PinCommentLayer({ asset, version, comments, onAddComment, activeCommentId, onSelectComment, pageNumber }: PinCommentLayerProps) {
  const [draftText, setDraftText] = useState('');
  const [activePin, setActivePin] = useState<{ x: number; y: number } | null>(null);

  const getComposerTransform = (pin: { x: number; y: number }) => {
    const xOffset = pin.x > 68 ? 'calc(-100% - 14px)' : '14px';
    const yOffset = pin.y > 68 ? 'calc(-100% - 14px)' : '14px';

    return `translate(${xOffset}, ${yOffset})`;
  };

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
    onAddComment(asset.id, version.id, activePin.x, activePin.y, draftText.trim(), '', pageNumber);
    setDraftText('');
    setActivePin(null);
  };

  return (
    <div className="absolute inset-0 cursor-crosshair" onClick={handleAddPin}>
      {activePin ? (
        <span
          aria-hidden="true"
          className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white bg-stone-950 text-sm font-semibold text-white shadow-lg ring-2 ring-amber-300"
          style={{ left: `${activePin.x}%`, top: `${activePin.y}%` }}
        >
          +
        </span>
      ) : null}

      {comments
        .filter((comment) => commentMatchesVersion(comment, asset, version) && (pageNumber == null || (comment.pageNumber ?? 1) === pageNumber) && !comment.parentCommentId && comment.x != null && comment.y != null)
        .map((comment, index) => {
          const isCreatorNote = comment.authorRole === 'creator';
          return (
            <button
              key={comment.id}
              data-pin-id={comment.id}
              className={`absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-sm font-semibold shadow-lg ${activeCommentId === comment.id ? 'bg-stone-950 text-white ring-2 ring-amber-300' : isCreatorNote ? 'border-stone-950 bg-white text-stone-950' : 'border-white bg-amber-600 text-white'}`}
              style={{ left: `${comment.x ?? 0}%`, top: `${comment.y ?? 0}%` }}
              onClick={(event) => {
                event.stopPropagation();
                onSelectComment(comment.id);
              }}
            >
              {index + 1}
            </button>
          );
        })}

      {activePin ? (
        <div
          className="absolute z-10 w-72 rounded-[12px] border border-stone-200 bg-white p-3 shadow-xl"
          style={{
            left: `${activePin.x}%`,
            top: `${activePin.y}%`,
            transform: getComposerTransform(activePin),
          }}
          onClick={(event) => event.stopPropagation()}
        >
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
