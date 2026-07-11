"use client";

import type { ReactNode, RefObject } from 'react';
import type { AssetVersion, ReviewAsset } from '@/lib/mock-data';

interface AssetSurfaceProps {
  asset: ReviewAsset;
  version?: AssetVersion;
  overlay?: ReactNode;
  scrollContainerRef?: RefObject<HTMLDivElement>;
}

export function AssetSurface({ asset, version, overlay, scrollContainerRef }: AssetSurfaceProps) {
  if (version?.previewUrl && version.status === 'ready') {
    return (
      <div className="mx-auto flex h-full w-full max-w-[1040px] flex-col rounded-[12px] border border-stone-200 bg-[#efede7] p-4 shadow-sm">
        <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-auto overscroll-contain rounded-[12px] border border-stone-200 bg-white shadow-sm [contain:layout_paint]">
          <div className="relative w-full">
          {/* eslint-disable-next-line @next/next/no-img-element -- Review previews may be blob or storage URLs. */}
            <img src={version.previewUrl} alt={`${asset.title} ${version.label}`} decoding="async" className="block h-auto w-full" />
            {overlay}
          </div>
        </div>
      </div>
    );
  }

  if (asset.assetType === 'pdf') {
    return (
      <div className="mx-auto flex h-[430px] max-w-[520px] flex-col rounded-[12px] border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3 text-sm text-stone-600">
          <span className="font-medium">Page preview</span>
          <span>{version?.pageNumber ?? 1} / {version?.pageCount ?? 2}</span>
        </div>
        <div className="mt-4 flex-1 rounded-[12px] border border-stone-200 bg-stone-50 p-4">
          <div className="h-10 w-24 rounded-full bg-stone-900" />
          <div className="mt-4 space-y-3">
            <div className="h-3 w-full rounded-full bg-stone-300" />
            <div className="h-3 w-5/6 rounded-full bg-stone-200" />
            <div className="h-3 w-2/3 rounded-full bg-stone-200" />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="h-16 rounded-[10px] bg-white shadow-sm" />
            <div className="h-16 rounded-[10px] bg-white shadow-sm" />
          </div>
        </div>
      </div>
    );
  }

  if (asset.assetType === 'image') {
    return (
      <div className="mx-auto flex h-[430px] max-w-[560px] items-center justify-center rounded-[12px] border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex w-full max-w-[380px] flex-col items-center rounded-[14px] border border-stone-200 bg-stone-50 p-6 text-center">
          <div className={`h-24 w-full rounded-[12px] bg-gradient-to-br ${asset.accent}`} />
          <div className="mt-5 h-10 w-36 rounded-full bg-stone-900" />
          <div className="mt-4 h-3 w-24 rounded-full bg-stone-300" />
          <div className="mt-2 h-3 w-20 rounded-full bg-stone-200" />
        </div>
      </div>
    );
  }

  const isMobile = /mobile/i.test(asset.title);

  return (
    <div className="mx-auto flex min-h-[430px] max-w-[860px] items-center justify-center rounded-[12px] border border-stone-200 bg-[#efede7] p-4 shadow-sm">
      <div className={`rounded-[16px] border border-stone-300 bg-white p-3 shadow-lg ${isMobile ? 'w-[240px]' : 'w-full max-w-[680px]'}`}>
        <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
          <div className="h-2.5 w-2.5 rounded-full bg-stone-300" />
          <div className="h-2.5 w-2.5 rounded-full bg-stone-300" />
          <div className="h-2.5 w-2.5 rounded-full bg-stone-300" />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
          <div className={`rounded-[12px] bg-gradient-to-br ${asset.accent} p-4 text-white ${isMobile ? 'min-h-[220px]' : 'min-h-[260px]'}`}>
            <div className="max-w-[220px] rounded-full border border-white/35 bg-white/20 px-3 py-2 text-[11px] uppercase tracking-[0.3em]">
              Review surface
            </div>
            <div className="mt-5 h-6 w-3/4 rounded-full bg-white/80" />
            <div className="mt-3 h-3 w-2/3 rounded-full bg-white/60" />
            <div className="mt-2 h-3 w-1/2 rounded-full bg-white/40" />
          </div>
          <div className="space-y-3">
            <div className="rounded-[12px] border border-stone-200 bg-stone-50 p-3">
              <div className="h-3 w-16 rounded-full bg-stone-300" />
              <div className="mt-3 h-16 rounded-[10px] bg-white" />
            </div>
            <div className="rounded-[12px] border border-stone-200 bg-stone-50 p-3">
              <div className="h-3 w-20 rounded-full bg-stone-300" />
              <div className="mt-3 h-8 rounded-[10px] bg-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
