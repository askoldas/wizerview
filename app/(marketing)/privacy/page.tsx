import type { Metadata } from 'next';
import { TextBand } from '@/components/marketing/marketing-sections';

export const metadata: Metadata = {
  title: 'Privacy — WizerView',
  description: 'Privacy information for WizerView.',
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return (
    <main>
      <TextBand title="Privacy" text="WizerView is in MVP development. This page is a placeholder for the full privacy policy before launch." />
    </main>
  );
}
