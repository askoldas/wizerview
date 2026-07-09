"use client";

interface DecisionBarProps {
  decision: string;
  onDecisionChange: (decision: string) => void;
}

export function DecisionBar({ decision, onDecisionChange }: DecisionBarProps) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-stone-500">Final decision</p>
          <h3 className="text-lg font-semibold text-stone-900">Close the loop clearly</h3>
        </div>
        <div className="rounded-full bg-stone-100 px-3 py-2 text-sm text-stone-600">
          {decision || 'Awaiting decision'}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {[
          { value: 'Approve', label: 'Approve' },
          { value: 'Request changes', label: 'Request changes' },
          { value: 'Select direction', label: 'Select direction' },
          { value: 'Suggest combining versions', label: 'Suggest combining versions' },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => onDecisionChange(option.value)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${decision === option.value ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700'}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
