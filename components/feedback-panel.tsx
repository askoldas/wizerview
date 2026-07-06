"use client";

interface FeedbackPanelProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function FeedbackPanel({ label, value, onChange }: FeedbackPanelProps) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
      <label className="text-sm font-semibold text-stone-800">{label}</label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Add thoughtful comments here"
        className="mt-3 min-h-24 w-full rounded-2xl border border-stone-200 bg-white px-3 py-3 text-sm outline-none"
      />
    </div>
  );
}
