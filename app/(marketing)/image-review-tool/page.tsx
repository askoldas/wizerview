import type { Metadata } from 'next';
import { CardGrid, FinalCTA, HeroSection, TextBand } from '@/components/marketing/marketing-sections';

export const metadata: Metadata = {
  title: 'Image Review Tool — WizerView',
  description: 'Review images with pinned comments, replies and approval. Upload visual assets and collect client feedback in one simple link.',
  alternates: { canonical: '/image-review-tool' },
  openGraph: { title: 'Image Review Tool — WizerView', description: 'Review images with pinned comments, replies and approval.' },
};

export default function ImageReviewToolPage() {
  return (
    <main>
      <HeroSection eyebrow="Image review tool" title="Review images with comments in context." text="Upload images, screenshots or visual assets and collect clear feedback without sending files back and forth." primary="Upload image for review" />
      <TextBand title="Screenshots and file attachments create feedback chaos." text="WizerView gives each image a focused review space with pinned comments, replies, versions and approval status." />
      <CardGrid title="How it works" cards={[
        { title: 'Upload image', text: 'Add the visual asset for review.' },
        { title: 'Share review link', text: 'Send one secure link to reviewers.' },
        { title: 'Resolve and approve', text: 'Clients comment on exact areas and approve the final version.' },
      ]} />
      <CardGrid title="Use cases" cards={['Exported design files', 'Screenshots', 'Creative previews', 'Visual assets', 'Banners', 'UI screens', 'Campaign graphics'].map((title) => ({ title, text: 'Collect visual feedback in context.' }))} />
      <FinalCTA title="Upload image for review." cta="Upload image for review" />
    </main>
  );
}
