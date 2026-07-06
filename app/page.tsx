import Link from 'next/link';
import { mockReviewSummaries } from '@/lib/mock-data';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10 lg:px-10">
      <header className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-stone-500">WizerView</p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-900">Client review workspace</h1>
          <p className="mt-2 max-w-2xl text-sm text-stone-600">
            Review directions, pin feedback directly on the work, and keep approvals moving without clutter.
          </p>
        </div>
        <Link
          href="/review-builder"
          className="inline-flex items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700"
        >
          New review
        </Link>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-500">Shared review links</p>
              <h2 className="mt-1 text-xl font-semibold text-stone-900">Recent reviews</h2>
            </div>
            <Link href="/review-builder" className="text-sm font-medium text-stone-700 underline-offset-4 hover:underline">
              Create another
            </Link>
          </div>

          <div className="mt-6 space-y-3">
            {mockReviewSummaries.map((review) => (
              <article key={review.id} className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-stone-900">{review.title}</h3>
                    <span className="rounded-full bg-stone-900 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-white">
                      {review.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-stone-600">{review.client}</p>
                  <p className="mt-2 text-sm text-stone-500">Updated {review.updatedAt}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-full border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600">
                    {review.comments} comments
                  </div>
                  <Link href={`/review/${review.id}`} className="rounded-full border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-white">
                    Open review
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-stone-900 p-6 text-stone-100 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-stone-400">Prototype</p>
          <h2 className="mt-2 text-2xl font-semibold">Designed for a single shareable review link</h2>
          <ul className="mt-6 space-y-3 text-sm text-stone-300">
            <li>• Compare options side by side or together</li>
            <li>• Pin comments directly onto visual surfaces</li>
            <li>• Capture a final decision without account creation</li>
          </ul>
          <Link href="/review/1" className="mt-8 inline-flex rounded-full bg-white px-4 py-2 text-sm font-medium text-stone-900 hover:bg-stone-200">
            Preview client experience
          </Link>
        </div>
      </section>
    </main>
  );
}
