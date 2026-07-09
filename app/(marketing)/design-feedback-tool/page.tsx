import type { Metadata } from 'next';
import { CardGrid, FinalCTA, HeroSection, TextBand } from '@/components/marketing/marketing-sections';

export const metadata: Metadata = {
  title: 'Design Feedback Tool — WizerView',
  description: 'Collect clear client feedback on design work. Share one review link, pin comments on the design and get approval without client registration.',
  alternates: { canonical: '/design-feedback-tool' },
  openGraph: { title: 'Design Feedback Tool — WizerView', description: 'Collect clear client feedback on design work.' },
};

export default function DesignFeedbackToolPage() {
  return (
    <main>
      <HeroSection eyebrow="Design feedback tool" title="Get clear client feedback on design work." text="Upload mockups, banners, brand concepts or UI screens and let clients comment directly on the exact area they mean." primary="Start design review" />
      <TextBand title="Design feedback gets messy when comments lose context." text="Screenshots in email, vague comments, multiple versions and unclear approval all slow down creative work." />
      <CardGrid title="How it works" cards={[
        { title: 'Upload design', text: 'Add the mockup, banner, brand concept or UI screen.' },
        { title: 'Share review link', text: 'Send one clean review link to the client.' },
        { title: 'Resolve and approve', text: 'Clients click, comment, reply and approve or request changes.' },
      ]} />
      <CardGrid title="Use cases" cards={['UI mockups', 'Banners', 'Brand concepts', 'Landing page designs', 'Social graphics', 'Ad creatives', 'Presentation visuals'].map((title) => ({ title, text: 'Keep feedback attached to the visual work.' }))} />
      <CardGrid title="Also useful" cards={[
        { title: 'Website feedback tool', text: 'Review screenshots and page previews.', href: '/website-feedback-tool' },
        { title: 'Image review tool', text: 'Review images with pinned comments.', href: '/image-review-tool' },
        { title: 'PDF proofing tool', text: 'Collect page-specific document feedback.', href: '/pdf-proofing-tool' },
      ]} />
      <FinalCTA title="Start design review." cta="Start design review" />
    </main>
  );
}
