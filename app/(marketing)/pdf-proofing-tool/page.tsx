import type { Metadata } from 'next';
import { CardGrid, FinalCTA, HeroSection, TextBand } from '@/components/marketing/marketing-sections';

export const metadata: Metadata = {
  title: 'PDF Proofing Tool — WizerView',
  description: 'Collect page-specific feedback on PDFs, brochures, proposals and documents. Share one link and get client approval without messy email threads.',
  alternates: { canonical: '/pdf-proofing-tool' },
  openGraph: { title: 'PDF Proofing Tool — WizerView', description: 'Collect page-specific feedback on PDFs, brochures, proposals and documents.' },
};

export default function PdfProofingToolPage() {
  return (
    <main>
      <HeroSection eyebrow="PDF proofing tool" title="Review PDFs and get client approval in one place." text="Upload proposals, brochures, decks and documents, then collect page-specific feedback in one review space." primary="Upload PDF for review" />
      <TextBand title="PDF feedback gets lost between email comments and marked-up attachments." text="Keep page-specific comments, versions and approval status together in one clean review link." />
      <CardGrid title="How it works" cards={[
        { title: 'Upload PDF', text: 'Add the document or proofing asset.' },
        { title: 'Review pages visually', text: 'Clients comment on the right page and location.' },
        { title: 'Get final approval', text: 'Resolve feedback and track the decision.' },
      ]} />
      <CardGrid title="Use cases" cards={['Brochures', 'Proposals', 'Presentations', 'Reports', 'Menus', 'Print layouts', 'Client documents'].map((title) => ({ title, text: 'Collect page-specific proofing feedback.' }))} />
      <FinalCTA title="Upload PDF for review." cta="Upload PDF for review" />
    </main>
  );
}
