import type { Metadata } from 'next';
import { CardGrid, FAQSection, FinalCTA, HeroSection, HowItWorks, SplitExperience, TextBand, ToolCards } from '@/components/marketing/marketing-sections';

export const metadata: Metadata = {
  title: 'WizerView — Visual Client Feedback and Approval Tool',
  description: 'Collect clear feedback on designs, website screenshots, images and PDFs. Share one review link, pin comments in context and get approval without client registration.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'WizerView — Visual Client Feedback and Approval Tool',
    description: 'Collect clear feedback on designs, website screenshots, images and PDFs without client registration.',
  },
};

export default function HomePage() {
  return (
    <main>
      <HeroSection
        title="Review smarter. Approve faster."
        text="WizerView helps freelancers and creative teams collect visual feedback on designs, website screenshots, images and PDFs — without forcing clients to create an account."
      />
      <TextBand title="Client feedback should not live in email threads." text="Feedback often gets scattered across email, screenshots, chat messages and calls. Comments lose context. Approvals become unclear. WizerView keeps feedback attached to the work itself." />
      <HowItWorks />
      <ToolCards />
      <TextBand title="Everything happens around the work." text="Pinned comments, versions, replies, open and resolved comments, approval decisions and share links stay connected to the exact deliverable being reviewed." />
      <SplitExperience />
      <CardGrid title="Start with one real client review for free." cards={[{ title: 'No credit card', text: 'No forced trial deadline. Upgrade when WizerView becomes part of your client workflow.', href: '/pricing' }]} />
      <FAQSection />
      <FinalCTA />
    </main>
  );
}
