import type { Metadata } from 'next';
import { CardGrid, FinalCTA, HeroSection, TextBand } from '@/components/marketing/marketing-sections';

export const metadata: Metadata = {
  title: 'Features — WizerView',
  description: 'Visual comments, client review links, versions, approvals and feedback resolution for designs, images, screenshots and PDFs.',
  alternates: { canonical: '/features' },
  openGraph: { title: 'Features — WizerView', description: 'Visual comments, versions, secure review links and approval status in one focused workspace.' },
};

export default function FeaturesPage() {
  return (
    <main>
      <HeroSection title="All the tools you need for clear client feedback." text="Visual comments, versions, secure review links and approval status in one focused workspace." primary="Start your first review" />
      <CardGrid title="Feature set" cards={[
        { title: 'Visual comments', text: 'Click directly on the deliverable and leave feedback in context.' },
        { title: 'Guest reviewers', text: 'Clients can review without creating an account.' },
        { title: 'Asset versions', text: 'Keep new versions connected to the same review.' },
        { title: 'Approval workflow', text: 'Clients can approve or request changes.' },
        { title: 'Comment resolution', text: 'Resolve feedback and keep track of what changed.' },
        { title: 'Secure review links', text: 'Share private review links with clients.' },
        { title: 'Image, screenshot and PDF review', text: 'Use one tool for common client deliverables.' },
        { title: 'Approval record', text: 'Know who approved what and when.' },
      ]} />
      <TextBand title="Built around the work, not around a task board." text="WizerView is a focused review space where the work remains the center of discussion." />
      <CardGrid title="Supported workflows" cards={[
        { title: 'Design feedback tool', text: 'Collect clear comments on designs.', href: '/design-feedback-tool' },
        { title: 'Website feedback tool', text: 'Review screenshots, mockups and page previews.', href: '/website-feedback-tool' },
        { title: 'Image review tool', text: 'Review images with pinned comments.', href: '/image-review-tool' },
        { title: 'PDF proofing tool', text: 'Collect page-specific PDF feedback.', href: '/pdf-proofing-tool' },
      ]} />
      <FinalCTA title="Start your first review." />
    </main>
  );
}
