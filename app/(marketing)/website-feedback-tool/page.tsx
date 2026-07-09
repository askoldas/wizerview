import type { Metadata } from 'next';
import { CardGrid, FinalCTA, HeroSection, TextBand } from '@/components/marketing/marketing-sections';

export const metadata: Metadata = {
  title: 'Website Feedback Tool for Screenshots and Page Reviews — WizerView',
  description: 'Collect clear feedback on website screenshots, landing page mockups and page previews. Share one review link, pin comments in context and get approval.',
  alternates: { canonical: '/website-feedback-tool' },
  openGraph: { title: 'Website Feedback Tool for Screenshots and Page Reviews — WizerView', description: 'Collect clear feedback on website screenshots, landing page mockups and page previews.' },
};

export default function WebsiteFeedbackToolPage() {
  return (
    <main>
      <HeroSection eyebrow="Website feedback tool" title="Collect clear feedback on website designs and screenshots." text="Upload a website screenshot, landing page mockup or converted page preview, then let clients click directly on the work, leave comments and approve the final version." primary="Start website feedback review" />
      <TextBand title='"Can you change the section near the top?" is not clear feedback.' text="Website feedback becomes vague when clients describe locations instead of commenting directly on the page preview." />
      <CardGrid title="How it works" cards={[
        { title: 'Upload screenshot or mockup', text: 'Use a website screenshot, landing page mockup or page-preview image.' },
        { title: 'Share review link', text: 'Clients open one link and pin comments on the page preview.' },
        { title: 'Resolve and approve', text: 'Resolve feedback, update versions and ask for approval.' },
      ]} />
      <CardGrid title="Use cases" cards={['Landing page screenshots', 'Homepage mockups', 'Website redesign previews', 'Mobile/desktop screenshots', 'Page layout feedback', 'Pre-launch visual QA', 'Client page approval'].map((title) => ({ title, text: 'Screenshot-based review for website visual work.' }))} />
      <TextBand title="Honest capability note" text="WizerView currently focuses on screenshot and page-preview review. Live URL capture and deeper website review options can be added later." />
      <CardGrid title="Related tools" cards={[
        { title: 'Design feedback tool', text: 'Collect clear comments on designs.', href: '/design-feedback-tool' },
        { title: 'Image review tool', text: 'Review images with pinned comments.', href: '/image-review-tool' },
        { title: 'PDF proofing tool', text: 'Collect page-specific PDF feedback.', href: '/pdf-proofing-tool' },
      ]} />
      <FinalCTA title="Start website feedback review." cta="Start website feedback review" />
    </main>
  );
}
