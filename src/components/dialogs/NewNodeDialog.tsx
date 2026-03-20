import { useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  onConfirm: (label: string, summary: string) => void;
  onCancel: () => void;
}

export function NewNodeDialog({ onConfirm, onCancel }: Props) {
  const [label, setLabel] = useState('');
  const [summary, setSummary] = useState('');

  return (
    <div className="fixed inset-0 bg-[#0d1117]/80 flex items-center justify-center z-50">
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 w-[380px] shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[#e6edf3] font-semibold">Add Node</h3>
          <button onClick={onCancel} className="text-[#8b949e] hover:text-[#e6edf3]">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#8b949e] mb-1.5">Label *</label>
            <input
              autoFocus
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && label.trim()) onConfirm(label.trim(), summary.trim());
                if (e.key === 'Escape') onCancel();
              }}
              placeholder="Entity name"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-[#e6edf3] text-sm placeholder-[#484f58] focus:outline-none focus:border-amber-400/60"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#8b949e] mb-1.5">Summary</label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && label.trim()) onConfirm(label.trim(), summary.trim());
                if (e.key === 'Escape') onCancel();
              }}
              placeholder="Brief description"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-[#e6edf3] text-sm placeholder-[#484f58] focus:outline-none focus:border-amber-400/60"
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-[#8b949e] hover:text-[#e6edf3] transition-colors">
            Cancel
          </button>
          <button
            onClick={() => label.trim() && onConfirm(label.trim(), summary.trim())}
            disabled={!label.trim()}
            className="px-4 py-2 text-sm bg-amber-400 text-[#0d1117] font-semibold rounded hover:bg-amber-300 disabled:opacity-40 transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
