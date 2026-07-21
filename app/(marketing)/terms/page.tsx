import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms — WizerView',
  description: 'Terms information for WizerView.',
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return <main className="mx-auto max-w-3xl px-4 py-16 text-text lg:px-8"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-subtle">WizerView legal</p><h1 className="mt-3 text-4xl font-semibold">Terms of use</h1><div className="mt-8 space-y-6 text-sm leading-7 text-text-muted"><p>WizerView provides a workspace for sharing creative review previews, discussion and decisions. You are responsible for the content you upload and for ensuring you have permission to share it.</p><p>Do not use the service to upload unlawful content, infringe rights, disrupt the service, or attempt to access another person’s workspace. Client share links should be shared only with intended reviewers.</p><p>The MVP may change as we improve the service. We may suspend access to protect the service, users, or content. For account or data questions, contact support.</p></div></main>;
}
