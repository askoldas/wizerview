"use client";

import type { ReviewOption } from '@/lib/mock-data';

interface ReviewSectionProps {
  section: ReviewOption;
}

export function ReviewSection({ section }: ReviewSectionProps) {
  return (
    <div className="rounded-[12px] border border-stone-200 bg-white px-3 py-3 text-sm text-stone-700">
      <p className="font-medium text-stone-900">{section.title}</p>
      <p className="mt-1 text-stone-600">{section.description}</p>
    </div>
  );
}
