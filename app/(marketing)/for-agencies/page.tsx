import type { Metadata } from 'next';
import { CardGrid, FinalCTA, HeroSection, TextBand } from '@/components/marketing/marketing-sections';

export const metadata: Metadata = {
  title: 'Client Feedback Tool for Agencies — WizerView',
  description: 'Keep client feedback, versions and approvals in one place. WizerView helps agencies collect visual feedback on creative work without messy email chains.',
  alternates: { canonical: '/for-agencies' },
  openGraph: { title: 'Client Feedback Tool for Agencies — WizerView', description: 'Keep client feedback, versions and approvals in one place.' },
};

export default function ForAgenciesPage() {
  return (
    <main>
      <HeroSection eyebrow="For agencies" title="Keep client feedback, versions and approvals in one place." text="WizerView gives agencies a focused review space for every client project, so teams can collect visual feedback, resolve comments and track approval without messy email chains." />
      <TextBand title="Client feedback gets messy when too many people are involved." text="Account managers collect email comments, designers receive unclear screenshots, developers get changes without context, and nobody is fully sure what is final." />
      <CardGrid title="A review workspace for every client project." cards={[
        { title: 'Create project', text: 'Set up a focused space for the client work.' },
        { title: 'Add work', text: 'Upload designs, screenshots or PDFs.' },
        { title: 'Collect and resolve', text: 'Share a secure link, collect pinned feedback, resolve comments and track approval.' },
      ]} />
      <CardGrid title="Agency benefits" cards={['One source of truth', 'Clear approval status', 'Version clarity', 'Easy client access', 'Better handoff', 'Professional client experience'].map((title) => ({ title, text: 'Reduce review chaos across client delivery.' }))} />
      <CardGrid title="Future agency workflow" cards={['Team members', 'Client workspaces', 'Custom branding', 'Approval history', 'Internal comments', 'Integrations'].map((title) => ({ title, text: 'Planned for future or paid workflow expansion.' }))} />
      <FinalCTA title="Give every client project a clear review space." />
    </main>
  );
}
