"use client";

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ReviewData, ReviewSection, ShareSettings } from '@/lib/mock-data';

interface ReviewBuilderProps {
  initialReview: ReviewData;
}

export function ReviewBuilder({ initialReview }: ReviewBuilderProps) {
  const [review, setReview] = useState<ReviewData>(initialReview);
  const [activeSectionType, setActiveSectionType] = useState<'review-together' | 'compare-options'>('compare-options');

  const shareSummary = useMemo(() => {
    const parts = [review.shareSettings.reviewerNameRequired ? 'name required' : 'name optional'];
    if (review.shareSettings.pinProtection) parts.push('PIN');
    if (review.shareSettings.allowComments) parts.push('comments');
    if (review.shareSettings.allowDecisions) parts.push('decisions');
    return parts.join(' • ');
  }, [review.shareSettings]);

  const addSection = () => {
    const section: ReviewSection = {
      id: `section-${Date.now()}`,
      type: activeSectionType,
      title: activeSectionType === 'compare-options' ? 'New comparison section' : 'New review together section',
      intro: 'Add context for the reviewer and keep the asset experience centered.',
      assets: activeSectionType === 'review-together' ? [] : undefined,
      options: activeSectionType === 'compare-options' ? [] : undefined,
    };

    setReview((current) => ({ ...current, sections: [...current.sections, section] }));
  };

  const updateShareSetting = (key: keyof ShareSettings, value: boolean) => {
    setReview((current) => ({
      ...current,
      shareSettings: { ...current.shareSettings, [key]: value },
    }));
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-6 py-8 lg:px-10">
      <header className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-stone-900 p-6 text-stone-100 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-stone-400">Review builder</p>
          <h1 className="mt-2 text-3xl font-semibold">{review.title}</h1>
          <p className="mt-3 max-w-2xl text-sm text-stone-300">Create a lightweight review link with clear sections, share settings, and a simple approval workflow.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/" className="rounded-full border border-stone-700 px-4 py-2 text-sm font-medium text-stone-200 hover:bg-stone-800">
            Back to dashboard
          </Link>
          <button className="rounded-full bg-white px-4 py-2 text-sm font-medium text-stone-900 hover:bg-stone-200">
            Copy review link
          </button>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <label className="block text-sm font-medium text-stone-700">Review title</label>
            <input
              value={review.title}
              onChange={(event) => setReview((current) => ({ ...current, title: event.target.value }))}
              className="mt-2 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none ring-0"
            />

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-stone-700">Client or project</label>
                <input
                  value={review.client}
                  onChange={(event) => setReview((current) => ({ ...current, client: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none ring-0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700">Instructions</label>
                <textarea
                  value={review.instructions}
                  onChange={(event) => setReview((current) => ({ ...current, instructions: event.target.value }))}
                  className="mt-2 min-h-24 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none ring-0"
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-500">Sections</p>
                <h2 className="mt-1 text-xl font-semibold text-stone-900">Review structure</h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveSectionType('compare-options')}
                  className={`rounded-full px-3 py-2 text-sm font-medium ${activeSectionType === 'compare-options' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700'}`}
                >
                  Compare options
                </button>
                <button
                  onClick={() => setActiveSectionType('review-together')}
                  className={`rounded-full px-3 py-2 text-sm font-medium ${activeSectionType === 'review-together' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700'}`}
                >
                  Review together
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {review.sections.map((section) => (
                <div key={section.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-stone-900">{section.title}</p>
                      <p className="mt-1 text-sm text-stone-600">{section.intro}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-2 text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
                      {section.type === 'compare-options' ? 'Compare options' : 'Review together'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={addSection} className="mt-5 rounded-full border border-dashed border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">
              Add {activeSectionType === 'compare-options' ? 'compare options' : 'review together'} section
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-500">Share settings</p>
                <h2 className="mt-1 text-xl font-semibold text-stone-900">Review link controls</h2>
              </div>
              <span className="rounded-full bg-stone-100 px-3 py-2 text-sm text-stone-600">{shareSummary}</span>
            </div>

            <div className="mt-5 space-y-3">
              {[
                { key: 'reviewerNameRequired' as const, label: 'Reviewer name required' },
                { key: 'pinProtection' as const, label: 'Optional PIN protection' },
                { key: 'allowComments' as const, label: 'Allow comments' },
                { key: 'allowDecisions' as const, label: 'Allow decisions' },
              ].map((setting) => (
                <label key={setting.key} className="flex items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                  <span>{setting.label}</span>
                  <input
                    type="checkbox"
                    checked={review.shareSettings[setting.key]}
                    onChange={(event) => updateShareSetting(setting.key, event.target.checked)}
                    className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-stone-50 p-6 shadow-sm">
            <p className="text-sm font-medium text-stone-500">Preview state</p>
            <h3 className="mt-1 text-lg font-semibold text-stone-900">The creator experience stays lightweight</h3>
            <p className="mt-3 text-sm text-stone-600">The review opens as a calm, public link with the asset at the center of the interaction.</p>
            <Link href={`/review/${review.id}`} className="mt-5 inline-flex rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700">
              Preview client version
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
