"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import { AssetSurface } from '@/components/asset-surface';
import { estimateStorageSavings, processImagePreview, processPdfPreview } from '@/lib/asset-processing';
import type { Asset, ReviewData, ReviewOption, ShareSettings } from '@/lib/mock-data';
import { loadReview, saveReview } from '@/lib/review-service';
import { createSupabaseClientInstance, isSupabaseConfigured } from '@/lib/supabase';

interface ReviewBuilderProps {
  initialReview: ReviewData;
}

export function ReviewBuilder({ initialReview }: ReviewBuilderProps) {
  const supabase = useMemo(() => createSupabaseClientInstance(), []);
  const [review, setReview] = useState<ReviewData>(initialReview);
  const [activeOptionId, setActiveOptionId] = useState(initialReview.options[0]?.id ?? '');
  const [activeAssetId, setActiveAssetId] = useState(initialReview.options[0]?.assets[0]?.id ?? '');
  const [activePdfPage, setActivePdfPage] = useState(1);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isReviewLoaded, setIsReviewLoaded] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [isSendingLogin, setIsSendingLogin] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;

    let ignored = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!ignored) {
        setAuthUser(data.user ?? null);
        setIsCheckingAuth(false);
      }
    }).catch(() => {
      if (!ignored) setIsCheckingAuth(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
    });

    return () => {
      ignored = true;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    let ignored = false;
    loadReview(initialReview.id).then((loaded) => {
      if (!ignored) {
        setReview(loaded);
        const firstOption = loaded.options[0];
        setActiveOptionId(firstOption?.id ?? '');
        setActiveAssetId(firstOption?.assets[0]?.id ?? '');
        setIsReviewLoaded(true);
      }
    });

    return () => {
      ignored = true;
    };
  }, [initialReview.id]);

  useEffect(() => {
    if (!isReviewLoaded) return;
    if (isCheckingAuth) return;
    if (isSupabaseConfigured() && !authUser) return;

    const timer = window.setTimeout(() => {
      saveReview(review).catch((error) => {
        setSaveMessage(error instanceof Error ? error.message : 'Autosave failed.');
      });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [authUser, isCheckingAuth, isReviewLoaded, review]);

  const activeOption = review.options.find((option) => option.id === activeOptionId) ?? review.options[0];
  const activeAsset = activeOption?.assets.find((asset) => asset.id === activeAssetId) ?? activeOption?.assets[0];
  const isComparisonReview = review.options.length > 1;

  const shareSummary = useMemo(() => {
    const parts = [review.shareSettings.reviewerNameRequired ? 'name required' : 'name optional'];
    if (review.shareSettings.pinProtection) parts.push('PIN');
    if (review.shareSettings.allowComments) parts.push('comments');
    if (review.shareSettings.allowDecisions) parts.push('decisions');
    return parts.join(' • ');
  }, [review.shareSettings]);

  const formatByteSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const handleAssetUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (isSupabaseConfigured() && !authUser) {
      setUploadMessage('Sign in before uploading optimized previews.');
      event.target.value = '';
      return;
    }

    const pendingAssetId = `asset-${Date.now()}`;
    const pendingAsset: Asset = {
      id: pendingAssetId,
      title: file.name.replace(/\.[^.]+$/, ''),
      kind: file.type === 'application/pdf' ? 'pdf' : 'screenshot',
      description: 'Preparing an optimized review preview.',
      accent: 'from-stone-700 via-stone-500 to-stone-200',
      notes: 'Processing preview…',
      status: 'processing',
      originalName: file.name,
      originalMimeType: file.type,
      originalBytes: file.size,
      storageHint: 'WizerView stores optimized review previews, not the original file.',
    };

    setReview((current) => ({
      ...current,
      options: current.options.map((option) => (option.id === activeOptionId ? { ...option, assets: [...option.assets, pendingAsset] } : option)),
    }));
    setActiveAssetId(pendingAssetId);
    setActivePdfPage(1);
    setUploadMessage(`Uploading ${file.name}…`);

    try {
      const processed = file.type === 'application/pdf' ? await processPdfPreview(file) : await processImagePreview(file);
      const nextAsset: Asset = {
        ...pendingAsset,
        title: processed.originalName.replace(/\.[^.]+$/, ''),
        kind: processed.kind === 'pdf' ? 'pdf' : 'screenshot',
        description: processed.storageHint,
        notes: `${processed.previewMimeType.toUpperCase()} preview • ${formatByteSize(processed.previewBytes)} • ${estimateStorageSavings(processed.originalBytes, processed.previewBytes)}% smaller`,
        status: 'ready',
        originalName: processed.originalName,
        originalMimeType: processed.originalMimeType,
        originalBytes: processed.originalBytes,
        previewUrl: processed.previewUrl,
        thumbnailUrl: processed.thumbnailUrl,
        previewMimeType: processed.previewMimeType,
        previewBytes: processed.previewBytes,
        storagePath: processed.storagePath,
        thumbnailStoragePath: processed.thumbnailStoragePath,
        width: processed.width,
        height: processed.height,
        pageCount: processed.pageCount,
        pageNumber: 1,
        storageHint: processed.storageHint,
      };

      setReview((current) => ({
        ...current,
        options: current.options.map((option) => (option.id === activeOptionId ? { ...option, assets: option.assets.map((asset) => (asset.id === pendingAssetId ? nextAsset : asset)) } : option)),
      }));
      setUploadMessage(`Original ${formatByteSize(processed.originalBytes)} → Preview ${formatByteSize(processed.previewBytes)} ${processed.previewMimeType.toUpperCase()} (${estimateStorageSavings(processed.originalBytes, processed.previewBytes)}% smaller)`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Processing failed.';
      setReview((current) => ({
        ...current,
        options: current.options.map((option) => (option.id === activeOptionId ? { ...option, assets: option.assets.map((asset) => (asset.id === pendingAssetId ? { ...asset, status: 'failed', notes: reason, description: 'Processing failed.' } : asset)) } : option)),
      }));
      setUploadMessage(reason);
    } finally {
      event.target.value = '';
    }
  };

  const addComparisonOption = () => {
    const nextIndex = review.options.length + 1;
    const newOption: ReviewOption = {
      id: `option-${Date.now()}`,
      title: `Option ${String.fromCharCode(64 + nextIndex)}`,
      description: 'A parallel option for the reviewer to compare.',
      assets: [],
    };

    setReview((current) => ({
      ...current,
      options: [...current.options, newOption],
    }));
    setActiveOptionId(newOption.id);
    setActiveAssetId('');
  };

  const addRelatedAsset = () => {
    if (!activeOption) return;
    const newAsset: Asset = {
      id: `asset-${Date.now()}`,
      title: 'Related asset',
      kind: 'screenshot',
      description: 'A new reviewable surface for this option.',
      accent: 'from-stone-700 via-stone-500 to-stone-200',
      notes: 'Ready for review.',
    };

    setReview((current) => ({
      ...current,
      options: current.options.map((option) => (option.id === activeOption.id ? { ...option, assets: [...option.assets, newAsset] } : option)),
    }));
    setActiveAssetId(newAsset.id);
  };

  const updateShareSetting = (key: keyof ShareSettings, value: boolean) => {
    setReview((current) => ({
      ...current,
      shareSettings: { ...current.shareSettings, [key]: value },
    }));
  };

  const handleSaveReview = async () => {
    if (isSupabaseConfigured() && !authUser) {
      setSaveMessage('Sign in to save reviews.');
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      await saveReview(review);
      setSaveMessage('Saved');
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Save failed.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendLoginLink = async () => {
    if (!supabase) {
      setAuthMessage('Add Supabase environment variables before signing in.');
      return;
    }

    setIsSendingLogin(true);
    setAuthMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: authEmail,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.href : undefined,
      },
    });

    if (error) {
      setAuthMessage(error.message);
    } else {
      setAuthMessage('Check your email for the sign-in link.');
    }

    setIsSendingLogin(false);
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setAuthUser(null);
    setSaveMessage(null);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-5 px-5 py-6 text-stone-950 lg:px-8">
      <header className="rounded-[14px] border border-stone-200 bg-white px-5 py-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-stone-500">WizerView builder</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">{review.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">Start with the asset preview, add related assets, and add comparison options only when the review needs them.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/" className="rounded-[10px] border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">
              Dashboard
            </Link>
            <button
              type="button"
              onClick={handleSaveReview}
              disabled={isSaving || isCheckingAuth || (isSupabaseConfigured() && !authUser)}
              className="rounded-[10px] border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : isCheckingAuth ? 'Checking login...' : 'Save review'}
            </button>
            <button className="rounded-[10px] bg-stone-950 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-800">
              Copy review link
            </button>
          </div>
        </div>
        {saveMessage ? <p className="mt-3 text-sm font-medium text-stone-600">{saveMessage}</p> : null}
        <div className="mt-4 rounded-[12px] border border-stone-200 bg-stone-50 p-3">
          {authUser ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-stone-900">Signed in</p>
                <p className="text-sm text-stone-600">{authUser.email}</p>
              </div>
              <button type="button" onClick={handleSignOut} className="rounded-[10px] border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100">
                Log out
              </button>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
              <label className="block">
                <span className="text-sm font-semibold text-stone-900">Creator login</span>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="mt-2 w-full rounded-[10px] border border-stone-200 bg-white px-3 py-2.5 text-sm"
                />
              </label>
              <button type="button" onClick={handleSendLoginLink} disabled={isSendingLogin || !authEmail} className="rounded-[10px] bg-stone-950 px-3 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60">
                {isSendingLogin ? 'Sending...' : 'Email sign-in link'}
              </button>
              {authMessage ? <p className="text-sm text-stone-600 lg:col-span-2">{authMessage}</p> : null}
            </div>
          )}
        </div>
      </header>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <div className="rounded-[14px] border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {review.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    setActiveOptionId(option.id);
                    setActiveAssetId(option.assets[0]?.id ?? '');
                  }}
                  className={`rounded-[10px] px-3 py-2 text-sm font-semibold ${activeOption?.id === option.id ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}
                >
                  {option.title}
                </button>
              ))}
              <button onClick={addComparisonOption} className="rounded-[10px] border border-dashed border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">
                + Add comparison option
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-[12px] border border-stone-200 bg-[#f7f6f2]">
              <div className="flex flex-col gap-3 border-b border-stone-200 bg-white px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-stone-900">Asset preview canvas</p>
                  <p className="text-sm text-stone-600">{activeOption?.description ?? 'A preview-ready surface for the reviewer.'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className={`rounded-[10px] bg-stone-950 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-stone-800 ${isSupabaseConfigured() && !authUser ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                    + Upload image/PDF
                    <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="sr-only" onChange={handleAssetUpload} disabled={isSupabaseConfigured() && !authUser} />
                  </label>
                  <button onClick={addRelatedAsset} className="rounded-[10px] border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700 shadow-sm hover:bg-stone-50">
                    + Add related asset
                  </button>
                </div>
              </div>

              <div className="p-4">
                {activeAsset ? (
                  <>
                    <div className="mb-3 rounded-[10px] border border-stone-200 bg-white p-3 text-sm text-stone-600">
                      <p className="font-medium text-stone-900">{activeAsset.status === 'processing' ? 'Processing optimized preview' : activeAsset.status === 'ready' ? 'Optimized review preview' : 'Preview ready for review'}</p>
                      <p className="mt-1">WizerView stores optimized review previews, not original files.</p>
                      {uploadMessage ? <p className="mt-2 text-xs uppercase tracking-[0.2em] text-stone-500">{uploadMessage}</p> : null}
                      {activeAsset.originalBytes && activeAsset.previewBytes ? (
                        <p className="mt-2 text-xs uppercase tracking-[0.2em] text-stone-500">
                          Original {formatByteSize(activeAsset.originalBytes)} → Preview {formatByteSize(activeAsset.previewBytes)} {activeAsset.previewMimeType?.toUpperCase() ?? 'WEBP'}
                        </p>
                      ) : null}
                    </div>
                    <div className="relative overflow-hidden rounded-[12px] border border-stone-200 bg-white p-3 shadow-sm">
                      <AssetSurface asset={activeAsset} />
                    </div>
                    {activeAsset.kind === 'pdf' && activeAsset.pageCount ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {Array.from({ length: activeAsset.pageCount }, (_, index) => (
                          <button
                            key={index + 1}
                            onClick={() => setActivePdfPage(index + 1)}
                            className={`rounded-[10px] px-3 py-2 text-sm font-semibold ${activePdfPage === index + 1 ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-700'}`}
                          >
                            Page {index + 1}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="flex min-h-[360px] items-center justify-center rounded-[12px] border border-dashed border-stone-300 bg-white text-center">
                    <div className="max-w-[260px]">
                      <p className="text-sm font-semibold text-stone-900">No asset yet</p>
                      <p className="mt-2 text-sm text-stone-600">Upload an asset to make the canvas the heart of this review.</p>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {activeOption?.assets.map((asset) => (
                    <button
                      key={asset.id}
                      onClick={() => setActiveAssetId(asset.id)}
                      className={`rounded-[10px] px-3 py-2 text-sm font-semibold ${activeAsset?.id === asset.id ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}
                    >
                      {asset.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[14px] border border-stone-200 bg-white p-4 shadow-sm">
            <label className="block text-sm font-medium text-stone-700">Review title</label>
            <input
              value={review.title}
              onChange={(event) => setReview((current) => ({ ...current, title: event.target.value }))}
              className="mt-2 w-full rounded-[10px] border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm"
            />

            <div className="mt-4 grid gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700">Client or project</label>
                <input
                  value={review.client}
                  onChange={(event) => setReview((current) => ({ ...current, client: event.target.value }))}
                  className="mt-2 w-full rounded-[10px] border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700">Client instructions</label>
                <textarea
                  value={review.instructions}
                  onChange={(event) => setReview((current) => ({ ...current, instructions: event.target.value }))}
                  className="mt-2 min-h-24 w-full rounded-[10px] border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="rounded-[14px] border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-500">Review contents</p>
                <h2 className="text-base font-semibold text-stone-900">Assets in this option</h2>
              </div>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-600">{activeOption?.assets.length ?? 0} assets</span>
            </div>
            {isComparisonReview ? (
              <p className="mt-3 rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                This review is in comparison mode because it has more than one option.
              </p>
            ) : null}
            <div className="mt-4 space-y-2">
              {activeOption?.assets.map((asset) => (
                <div key={asset.id} className="flex items-center justify-between rounded-[10px] border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-700">
                  <div>
                    <p className="font-medium text-stone-900">{asset.title}</p>
                    <p className="text-xs text-stone-500">{asset.description}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-stone-500">
                      {asset.previewMimeType?.toUpperCase() ?? 'PREVIEW'} • {asset.previewBytes ? formatByteSize(asset.previewBytes) : 'mock'} • {asset.status ?? 'idle'}
                    </p>
                  </div>
                  <span className="text-xs uppercase tracking-[0.2em] text-stone-500">{asset.kind}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[14px] border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-500">Share settings</p>
                <h2 className="text-base font-semibold text-stone-900">Preview quality and access</h2>
              </div>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-600">{shareSummary}</span>
            </div>

            <div className="mt-4 space-y-2">
              {[
                { key: 'reviewerNameRequired' as const, label: 'Reviewer name required' },
                { key: 'pinProtection' as const, label: 'Optional PIN protection' },
                { key: 'allowComments' as const, label: 'Allow comments' },
                { key: 'allowDecisions' as const, label: 'Allow decisions' },
              ].map((setting) => (
                <label key={setting.key} className="flex items-center justify-between rounded-[10px] border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-700">
                  <span>{setting.label}</span>
                  <input
                    type="checkbox"
                    checked={review.shareSettings[setting.key]}
                    onChange={(event) => updateShareSetting(setting.key, event.target.checked)}
                    className="h-4 w-4 rounded border-stone-300 text-stone-900"
                  />
                </label>
              ))}
            </div>

            <Link href={`/review/${review.id}`} className="mt-4 inline-flex rounded-[10px] bg-stone-950 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-800">
              Preview client view
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
