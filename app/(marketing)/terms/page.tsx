import type { Metadata } from 'next';
import { TextBand } from '@/components/marketing/marketing-sections';

export const metadata: Metadata = {
  title: 'Terms — WizerView',
  description: 'Terms information for WizerView.',
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return (
    <main>
      <TextBand title="Terms" text="WizerView is in MVP development. This page is a placeholder for the full terms before launch." />
    </main>
  );
}
