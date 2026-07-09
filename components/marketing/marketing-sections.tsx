import Link from 'next/link';
import { ProductMockup } from './product-mockup';
import { faqs, toolCards } from './marketing-data';
import { StartFreeButton } from './marketing-cta';

export function HeroSection({ eyebrow, title, text, primary = 'Start free', secondary = 'See how it works' }: { eyebrow?: string; title: string; text: string; primary?: string; secondary?: string }) {
  return (
    <section className="px-4 py-16 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div>
          {eyebrow ? <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">{eyebrow}</p> : null}
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-text sm:text-5xl">{title}</h1>
          <p className="mt-5 text-lg leading-8 text-text-muted">{text}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <StartFreeButton className="rounded-md bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-strong">{primary}</StartFreeButton>
            <a href="#how-it-works" className="rounded-md border border-border bg-surface px-5 py-3 text-sm font-semibold text-text-muted hover:bg-surface-muted">{secondary}</a>
          </div>
        </div>
        <ProductMockup />
      </div>
    </section>
  );
}

export function TextBand({ title, text }: { title: string; text: string }) {
  return (
    <section className="border-y border-border bg-surface px-4 py-14 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-text">{title}</h2>
        <p className="mt-4 text-base leading-7 text-text-muted">{text}</p>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    ['Add the work', 'Upload an image, screenshot or PDF.'],
    ['Share a review link', 'Send a secure link to your client. No reviewer account required.'],
    ['Collect feedback and approval', 'Clients click directly on the work, leave comments, and approve or request changes.'],
  ];
  return <CardGrid id="how-it-works" title="How it works" cards={steps.map(([title, text]) => ({ title, text }))} />;
}

export function CardGrid({ id, title, cards }: { id?: string; title: string; cards: Array<{ title: string; text: string; href?: string }> }) {
  return (
    <section id={id} className="px-4 py-14 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-3xl font-semibold tracking-tight text-text">{title}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {cards.map((card) => {
            const body = (
              <div className="h-full rounded-lg border border-border bg-surface p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-text">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-text-muted">{card.text}</p>
              </div>
            );
            return card.href ? <Link key={card.title} href={card.href}>{body}</Link> : <div key={card.title}>{body}</div>;
          })}
        </div>
      </div>
    </section>
  );
}

export function ToolCards() {
  return <CardGrid title="What you can review" cards={toolCards.map((card) => ({ ...card }))} />;
}

export function SplitExperience() {
  return (
    <section className="bg-surface px-4 py-14 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface-muted p-6">
          <h2 className="text-2xl font-semibold text-text">Easy for clients.</h2>
          <ul className="mt-4 grid gap-2 text-sm leading-6 text-text-muted">
            {['Open the link', 'Enter name', 'Click on the work', 'Leave feedback', 'Approve or request changes'].map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <div className="rounded-lg border border-border bg-surface-muted p-6">
          <h2 className="text-2xl font-semibold text-text">Clear for you.</h2>
          <ul className="mt-4 grid gap-2 text-sm leading-6 text-text-muted">
            {['Track comments', 'Reply in context', 'Resolve feedback', 'Manage versions', 'Keep approval history'].map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function FAQSection({ items = faqs }: { items?: typeof faqs }) {
  return (
    <section className="px-4 py-14 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-3xl font-semibold tracking-tight text-text">FAQ</h2>
        <div className="mt-6 grid gap-3">
          {items.map((item) => (
            <div key={item.question} className="rounded-lg border border-border bg-surface p-5">
              <h3 className="font-semibold text-text">{item.question}</h3>
              <p className="mt-2 text-sm leading-6 text-text-muted">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCTA({ title = 'Create your first client review link.', cta = 'Start free' }: { title?: string; cta?: string }) {
  return (
    <section className="px-4 py-16 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-lg bg-brand p-8 text-center text-white">
        <h2 className="text-3xl font-semibold tracking-tight">{title}</h2>
        <StartFreeButton className="mt-6 inline-flex rounded-md bg-white px-5 py-3 text-sm font-semibold text-brand-strong">
          {cta}
        </StartFreeButton>
      </div>
    </section>
  );
}
