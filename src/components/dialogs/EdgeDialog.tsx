import { useState } from 'react';
import { X } from 'lucide-react';
import { useGraphStore } from '../../store/graphStore';

interface Props {
  edgeId: string;
  onClose: () => void;
}

export function EdgeDialog({ edgeId, onClose }: Props) {
  const edge = useGraphStore((s) => s.edges[edgeId]);
  const updateEdge = useGraphStore((s) => s.updateEdge);
  const deleteEdge = useGraphStore((s) => s.deleteEdge);
  const [label, setLabel] = useState(edge?.label ?? '');
  const [notes, setNotes] = useState(edge?.notes ?? '');

  if (!edge) return null;

  const save = () => {
    updateEdge(edgeId, { label: label.trim() || undefined, notes: notes.trim() || undefined });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#0d1117]/80 flex items-center justify-center z-50">
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 w-[400px] shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[#e6edf3] font-semibold">Edit Connection</h3>
          <button onClick={onClose} className="text-[#8b949e] hover:text-[#e6edf3]">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#8b949e] mb-1.5">Relationship Label</label>
            <input
              autoFocus
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="photographed at, associated with..."
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-[#e6edf3] text-sm placeholder-[#484f58] focus:outline-none focus:border-amber-400/60"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#8b949e] mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Evidence, dates, source..."
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-[#e6edf3] text-sm placeholder-[#484f58] focus:outline-none focus:border-amber-400/60 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => { deleteEdge(edgeId); onClose(); }}
            className="text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            Delete
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-[#8b949e] hover:text-[#e6edf3] transition-colors">
              Cancel
            </button>
            <button
              onClick={save}
              className="px-4 py-2 text-sm bg-amber-400 text-[#0d1117] font-semibold rounded hover:bg-amber-300 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
