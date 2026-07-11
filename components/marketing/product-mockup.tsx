export function ProductMockup() {
  return (
    <div className="rounded-lg border border-border bg-surface p-3 shadow-md">
      <div className="grid min-h-[420px] gap-3 lg:grid-cols-[150px_minmax(0,1fr)_260px]">
        <aside className="rounded-md bg-surface-muted p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-subtle">Deliverables</p>
          {['Homepage v2', 'Mobile view', 'PDF page'].map((item, index) => (
            <div key={item} className={`mt-3 rounded-md border p-2 ${index === 0 ? 'border-brand bg-brand-soft' : 'border-border bg-surface'}`}>
              <div className="h-16 rounded-sm bg-gradient-to-br from-brand to-brand-strong" />
              <p className="mt-2 text-xs font-semibold text-text">{item}</p>
            </div>
          ))}
        </aside>
        <section className="rounded-md border border-border bg-canvas p-4">
          <div className="mb-3 flex gap-2">
            {['Version A', 'Version B'].map((version, index) => (
              <span key={version} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${index === 1 ? 'bg-brand text-white' : 'bg-surface text-text-muted ring-1 ring-border'}`}>{version}</span>
            ))}
          </div>
          <div className="relative min-h-[320px] overflow-hidden rounded-md bg-surface">
            <div className="absolute inset-x-8 top-10 h-20 rounded-md bg-brand-soft" />
            <div className="absolute left-10 top-40 h-24 w-56 rounded-md bg-accent-soft" />
            <div className="absolute right-10 top-32 h-36 w-44 rounded-md border border-border bg-surface-muted" />
            <span className="absolute left-[38%] top-24 flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-white shadow-md">1</span>
            <span className="absolute right-[20%] top-56 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-white shadow-md">2</span>
          </div>
        </section>
        <aside className="rounded-md border border-border bg-surface p-3">
          <p className="text-sm font-semibold text-text">Pinned feedback</p>
          {['Move the pricing block higher.', 'This mobile header feels approved.'].map((comment, index) => (
            <div key={comment} className="mt-3 rounded-md border border-border bg-surface-muted p-3">
              <p className="text-xs font-semibold text-text">Pin {index + 1}</p>
              <p className="mt-1 text-sm leading-5 text-text-muted">{comment}</p>
            </div>
          ))}
          <button type="button" className="mt-4 w-full rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white">Approve version</button>
        </aside>
      </div>
    </div>
  );
}
