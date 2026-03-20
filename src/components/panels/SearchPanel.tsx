import { useRef, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { useSearch } from '../../hooks/useSearch';

interface Props {
  onSelectNode: (nodeId: string) => void;
  onClose: () => void;
}

export function SearchPanel({ onSelectNode, onClose }: Props) {
  const { query, setQuery, results } = useSearch();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 w-[520px] z-40">
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#30363d]">
          <Search size={15} className="text-[#8b949e]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && onClose()}
            placeholder="Search nodes..."
            className="flex-1 bg-transparent text-[#e6edf3] text-sm focus:outline-none placeholder-[#484f58]"
          />
          <button onClick={onClose} className="text-[#8b949e] hover:text-[#e6edf3]">
            <X size={15} />
          </button>
        </div>

        {results.length > 0 && (
          <div className="max-h-[300px] overflow-y-auto">
            {results.map((node) => (
              <button
                key={node.id}
                onClick={() => { onSelectNode(node.id); onClose(); }}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[#1c2333] transition-colors border-b border-[#21262d] last:border-0 text-left"
              >
                <div>
                  <div className="text-sm font-medium text-[#e6edf3]">{node.label}</div>
                  {node.summary && (
                    <div className="text-xs text-[#8b949e] mt-0.5">{node.summary}</div>
                  )}
                  {node.tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {node.tags.map((t) => (
                        <span key={t} className="text-[10px] px-1 rounded bg-[#21262d] text-[#8b949e]">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {query && results.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-[#484f58]">No results</div>
        )}
      </div>
    </div>
  );
}
