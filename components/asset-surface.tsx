"use client";

import type { Asset } from '@/lib/mock-data';

interface AssetSurfaceProps {
  asset: Asset;
}

export function AssetSurface({ asset }: AssetSurfaceProps) {
  return (
    <div className={`relative h-56 overflow-hidden bg-gradient-to-br ${asset.accent}`}>
      <div className="absolute inset-0 opacity-80">
        <div className="absolute left-6 top-6 h-20 w-32 rounded-2xl border border-white/40 bg-white/20 backdrop-blur-sm" />
        <div className="absolute bottom-8 left-1/2 h-36 w-40 -translate-x-1/2 rounded-[2rem] border border-white/30 bg-white/20" />
        <div className="absolute right-6 top-10 h-16 w-16 rounded-full border border-white/50 bg-white/40" />
      </div>
      <div className="absolute bottom-4 left-4 rounded-full bg-stone-900/85 px-3 py-2 text-xs font-medium uppercase tracking-[0.25em] text-white">
        {asset.kind}
      </div>
    </div>
  );
}
