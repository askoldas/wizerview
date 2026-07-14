import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Support — WizerView', description: 'WizerView support and account help.' };

export default function SupportPage() {
  return <main className="mx-auto max-w-3xl px-4 py-16 text-text lg:px-8"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-subtle">WizerView support</p><h1 className="mt-3 text-4xl font-semibold">Help with your review workspace</h1><p className="mt-4 max-w-2xl text-base leading-7 text-text-muted">For access, review links, account changes, or deletion requests, email <a className="font-semibold text-brand" href="mailto:hello@wizerview.app">hello@wizerview.app</a>. Include the email on your account and any relevant Project or Review link.</p><section className="mt-10 rounded-lg border border-border bg-surface p-5"><h2 className="font-semibold">Account deletion</h2><p className="mt-2 text-sm leading-6 text-text-muted">Deletion requests are handled after account verification. We will explain what is removed and any records retained for legitimate operational reasons.</p></section></main>;
}
