import { Plus } from 'lucide-react';
import { useProviderStore } from '../../providers/providerStore';
import type { OsintProvider } from '../../providers/types';

const CATEGORY_LABELS: Record<string, string> = {
  network: 'Network', domain: 'Domain', person: 'Person', email: 'Email',
  social: 'Social', geo: 'Geo', darkweb: 'Dark Web', custom: 'Custom',
};

function statusDot(p: OsintProvider) {
  if (!p.enabled) return 'bg-[#484f58]';
  const hasError = p.stats.lastRun !== null && p.stats.errors > 0 &&
    p.stats.errors === p.stats.requests;
  if (hasError) return 'bg-red-400';
  return 'bg-[#3fb950]';
}

interface Props {
  selectedId: string | null;
  onSelect:   (id: string) => void;
  onAdd:      () => void;
}

export function ProviderList({ selectedId, onSelect, onAdd }: Props) {
  const providers = useProviderStore((s) => s.providers);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#30363d] shrink-0">
        <span className="text-[10px] uppercase tracking-wider text-[#484f58] font-mono">Providers</span>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-[#8b949e] hover:text-amber-400 hover:bg-[#1c2333] rounded transition-colors"
        >
          <Plus size={10} /> Add
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {providers.length === 0 && (
          <div className="px-3 py-6 text-center text-[11px] text-[#484f58]">
            No providers yet.<br />
            <button onClick={onAdd} className="text-amber-400 hover:underline mt-1">Add one</button>
          </div>
        )}
        {providers.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`w-full text-left px-3 py-2 border-b border-[#30363d] hover:bg-[#1c2333] transition-colors ${
              selectedId === p.id ? 'bg-[#1c2333]' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot(p)}`} />
              <span className={`text-[12px] font-medium truncate ${selectedId === p.id ? 'text-amber-400' : 'text-[#e6edf3]'}`}>
                {p.name}
              </span>
            </div>
            <div className="mt-0.5 ml-3.5 flex items-center gap-2">
              <span className="text-[10px] text-[#484f58] font-mono">
                {CATEGORY_LABELS[p.category] ?? p.category}
              </span>
              {p.stats.lastRun && (
                <span className="text-[10px] text-[#3a3f47] font-mono">
                  · {p.stats.requests}req
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
