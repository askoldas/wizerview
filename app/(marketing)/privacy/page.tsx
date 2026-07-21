import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy — WizerView',
  description: 'Privacy information for WizerView.',
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return <main className="mx-auto max-w-3xl px-4 py-16 text-text lg:px-8"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-subtle">WizerView legal</p><h1 className="mt-3 text-4xl font-semibold">Privacy</h1><div className="mt-8 space-y-6 text-sm leading-7 text-text-muted"><p>We process account email addresses, workspace content, review comments and technical information needed to operate WizerView. Share links can expose the specific Project or Review chosen by its creator.</p><p>We use this information to provide the service, secure access, respond to support requests and improve reliability. We do not sell personal information.</p><p>Creators can request account or data help through support. Client reviewers do not need an account for shared work unless a future flow explicitly asks them to create one.</p></div></main>;
}
