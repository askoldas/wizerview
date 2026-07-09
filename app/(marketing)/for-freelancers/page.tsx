import type { Metadata } from 'next';
import { CardGrid, FinalCTA, HeroSection, TextBand } from '@/components/marketing/marketing-sections';

export const metadata: Metadata = {
  title: 'Client Feedback Tool for Freelancers — WizerView',
  description: 'Send clients one clean review link for designs, screenshots, images and PDFs. Collect clear feedback and approval without client accounts.',
  alternates: { canonical: '/for-freelancers' },
  openGraph: { title: 'Client Feedback Tool for Freelancers — WizerView', description: 'Send clients one clean review link for visual feedback and approval.' },
};

export default function ForFreelancersPage() {
  return (
    <main>
      <HeroSection eyebrow="For freelancers" title="Client feedback that makes you look professional." text="WizerView helps freelancers share designs, website previews, images and PDFs in one clean review link — so clients can comment clearly and approve without creating an account." />
      <TextBand title="Stop chasing feedback across email, screenshots and chat." text="Clients send comments in different places, screenshots lose context, small changes become long email threads, and approval is unclear." />
      <CardGrid title="Send one link. Get clear feedback." cards={['No client login', 'Comments on the work', 'Simple approval', 'Versions in one place', 'Professional delivery'].map((title) => ({ title, text: 'A cleaner client review experience for everyday freelance projects.' }))} />
      <CardGrid title="Everyday freelance workflows" cards={['Logo concepts', 'Website screenshots', 'Landing page designs', 'Social media graphics', 'PDF proposals', 'Brand presentations', 'Client documents', 'UI mockups'].map((title) => ({ title, text: 'Share a focused review link and keep feedback in context.' }))} />
      <TextBand title="Start free with a real client project." text="Your first client review should not require a credit card or a 14-day countdown. Start with one active review, then upgrade when WizerView becomes part of your regular workflow." />
      <FinalCTA title="Create your first client review link." />
    </main>
  );
}
