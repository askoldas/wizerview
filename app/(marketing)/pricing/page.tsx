import type { Metadata } from 'next';
import { FAQSection, FinalCTA, HeroSection, TextBand } from '@/components/marketing/marketing-sections';
import { StartFreeButton } from '@/components/marketing/marketing-cta';

export const metadata: Metadata = {
  title: 'Pricing — WizerView',
  description: 'Start free with one real client review. Upgrade for more active reviews, branding, exports and team workflow.',
  alternates: { canonical: '/pricing' },
  openGraph: { title: 'Pricing — WizerView', description: 'Start free with one real client review.' },
};

const plans = [
  ['Free', '€0/month', 'For your first client review', ['1 active project', '1 active review link', 'Image/screenshot/PDF review', 'Unlimited guest reviewers', 'Comments and replies', 'Approve or request changes', 'WizerView branding'], 'Start free'],
  ['Solo', '€12/month', 'For freelancers', ['Up to 10 active projects', 'Multiple review links', 'More storage', 'Email notifications', 'Reduced or removed WizerView branding', 'Comment export'], 'Start Solo'],
  ['Studio', '€24/month', 'For small creative teams', ['More active projects', '2-3 creator seats', 'Custom client-facing logo', 'Version history', 'Client/project spaces', 'Priority support'], 'Start Studio'],
  ['Agency', '€59/month', 'For teams with many reviews', ['5+ creator seats', 'High active project limits', 'Team roles', 'Approval history', 'Integrations later', 'Priority support'], 'Start Agency'],
];

export default function PricingPage() {
  return (
    <main>
      <HeroSection title="Start free. Upgrade when client review becomes part of your workflow." text="Your first real client review is free. Paid plans unlock more active work, branding, exports and team features." />
      <section className="px-4 py-14 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-4">
          {plans.map(([name, price, intro, features, cta]) => (
            <article key={name as string} className="rounded-lg border border-border bg-surface p-5 shadow-sm">
              <h2 className="text-xl font-semibold text-text">{name}</h2>
              <p className="mt-2 text-3xl font-semibold text-brand">{price}</p>
              <p className="mt-2 text-sm text-text-muted">{intro}</p>
              <ul className="mt-5 grid gap-2 text-sm leading-6 text-text-muted">
                {(features as string[]).map((feature) => <li key={feature}>{feature}</li>)}
              </ul>
              <StartFreeButton className="mt-5 inline-flex rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong">{cta as string}</StartFreeButton>
            </article>
          ))}
        </div>
      </section>
      <TextBand title="Shared client links should not break." text="If you reach a plan limit, existing reviews stay viewable. Your client links and existing comments remain accessible, so you are never embarrassed after sending a review to a client. Excess active reviews may become read-only or require archiving/upgrading before creating more work." />
      <FAQSection items={[
        { question: 'Is there a free plan?', answer: 'Yes. The free plan supports your first real client review.' },
        { question: 'Do clients count as paid users?', answer: 'No. Guest reviewers do not need accounts.' },
        { question: 'What happens if I reach my active project limit?', answer: 'Existing links stay viewable; you may need to archive or upgrade before creating more active work.' },
        { question: 'Can I cancel anytime?', answer: 'Yes, paid plans are intended to stay simple and flexible.' },
        { question: 'Can I use WizerView with multiple clients?', answer: 'Yes, paid plans are designed for ongoing client workflows.' },
        { question: 'Do archived reviews remain available?', answer: 'The product direction is to keep existing client links accessible and avoid breaking shared reviews.' },
      ]} />
      <FinalCTA />
    </main>
  );
}
