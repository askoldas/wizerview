"use client";

import type { Asset } from '@/lib/mock-data';

interface AssetSurfaceProps {
  asset: Asset;
}

export function AssetSurface({ asset }: AssetSurfaceProps) {
  if (asset.previewUrl && asset.status === 'ready') {
    return (
      <div className="mx-auto flex h-[360px] max-w-[760px] items-center justify-center rounded-[16px] border border-stone-300 bg-stone-100 p-4 shadow-sm">
        <div className="relative w-full overflow-hidden rounded-[16px] border border-stone-200 bg-white">
          <img src={asset.previewUrl} alt={asset.title} className="h-[320px] w-full object-contain" />
          <div className="absolute left-3 top-3 rounded-full bg-stone-900/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
            {asset.kind === 'pdf' ? 'PDF preview' : 'Optimized preview'}
          </div>
        </div>
      </div>
    );
  }

  if (asset.kind === 'pdf') {
    return (
      <div className="mx-auto flex h-[360px] max-w-[480px] flex-col rounded-[16px] border border-stone-300 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3 text-sm text-stone-600">
          <span className="font-medium">Page preview</span>
          <span>1 / 2</span>
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

  if (asset.kind === 'image') {
    return (
      <div className="mx-auto flex h-[360px] max-w-[520px] items-center justify-center rounded-[16px] border border-stone-300 bg-white p-6 shadow-sm">
        <div className="flex w-full max-w-[360px] flex-col items-center rounded-[20px] border border-stone-200 bg-stone-50 p-6 text-center">
          <div className={`h-20 w-full rounded-[14px] bg-gradient-to-br ${asset.accent}`} />
          <div className="mt-5 h-10 w-36 rounded-full bg-stone-900" />
          <div className="mt-4 h-3 w-24 rounded-full bg-stone-300" />
          <div className="mt-2 h-3 w-20 rounded-full bg-stone-200" />
        </div>
      </div>
    );
  }

  const isMobile = /mobile/i.test(asset.title);

  return (
    <div className="mx-auto flex h-[360px] max-w-[760px] items-center justify-center rounded-[16px] border border-stone-300 bg-stone-100 p-4 shadow-sm">
      <div className={`rounded-[24px] border border-stone-300 bg-white p-3 shadow-lg ${isMobile ? 'w-[220px]' : 'w-full max-w-[620px]'}`}>
        <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
          <div className="h-2.5 w-2.5 rounded-full bg-stone-300" />
          <div className="h-2.5 w-2.5 rounded-full bg-stone-300" />
          <div className="h-2.5 w-2.5 rounded-full bg-stone-300" />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
          <div className={`rounded-[14px] bg-gradient-to-br ${asset.accent} p-4 text-white ${isMobile ? 'min-h-[180px]' : 'min-h-[220px]'}`}>
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
