import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useProviderStore } from '../../providers/providerStore';
import type { LogLevel } from '../../providers/types';

const LEVEL_DOT: Record<LogLevel, string> = {
  success: 'bg-[#3fb950]',
  error:   'bg-red-400',
  warn:    'bg-amber-400',
  info:    'bg-[#8b949e]',
};

const LEVEL_TEXT: Record<LogLevel, string> = {
  success: 'text-[#3fb950]',
  error:   'text-red-400',
  warn:    'text-amber-400',
  info:    'text-[#8b949e]',
};

type Filter = 'all' | LogLevel;

function fmt(ts: number) {
  return new Date(ts).toLocaleTimeString('en-GB', { hour12: false });
}

export function ProviderLog() {
  const log      = useProviderStore((s) => s.log);
  const clearLog = useProviderStore((s) => s.clearLog);
  const providers = useProviderStore((s) => s.providers);

  const [filter, setFilter] = useState<Filter>('all');

  // Aggregate stats across all providers
  const totalRequests = providers.reduce((a, p) => a + p.stats.requests, 0);
  const totalErrors   = providers.reduce((a, p) => a + p.stats.errors, 0);
  const totalNodes    = providers.reduce((a, p) => a + p.stats.nodes, 0);

  const visible = filter === 'all' ? log : log.filter((e) => e.level === filter);

  return (
    <div className="flex flex-col h-full">
      {/* Stats */}
      <div className="px-3 py-2.5 border-b border-[#30363d] shrink-0">
        <div className="grid grid-cols-3 gap-2">
          <StatBox label="Requests" value={totalRequests} />
          <StatBox label="Errors"   value={totalErrors}   accent="text-red-400" />
          <StatBox label="Nodes"    value={totalNodes}    accent="text-[#3fb950]" />
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-[#30363d] shrink-0">
        {(['all', 'success', 'error', 'warn', 'info'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2 py-0.5 text-[10px] rounded transition-colors capitalize ${
              filter === f
                ? 'bg-amber-400/15 text-amber-400 border border-amber-400/30'
                : 'text-[#484f58] hover:text-[#8b949e]'
            }`}
          >
            {f}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={clearLog}
          className="p-1 text-[#484f58] hover:text-red-400 transition-colors rounded"
          title="Clear log"
        >
          <Trash2 size={11} />
        </button>
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto">
        {visible.length === 0 && (
          <div className="px-3 py-6 text-center text-[11px] text-[#484f58]">No entries</div>
        )}
        {visible.map((entry) => (
          <div key={entry.id} className="px-3 py-2 border-b border-[#30363d]/50 hover:bg-[#1c2333]/50">
            <div className="flex items-start gap-2">
              <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${LEVEL_DOT[entry.level]}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono ${LEVEL_TEXT[entry.level]}`}>
                    {entry.providerName}
                  </span>
                  <span className="text-[10px] font-mono text-[#3a3f47]">{fmt(entry.ts)}</span>
                </div>
                <div className="text-[11px] text-[#8b949e] leading-tight mt-0.5 break-words">
                  {entry.message}
                </div>
                {(entry.meta.nodes || entry.meta.edges || entry.meta.duration || entry.meta.seed) && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {entry.meta.seed && (
                      <span className="text-[10px] font-mono text-[#484f58]">seed: {entry.meta.seed}</span>
                    )}
                    {entry.meta.nodes != null && (
                      <span className="text-[10px] font-mono text-[#484f58]">{entry.meta.nodes} nodes</span>
                    )}
                    {entry.meta.edges != null && (
                      <span className="text-[10px] font-mono text-[#484f58]">{entry.meta.edges} edges</span>
                    )}
                    {entry.meta.duration != null && (
                      <span className="text-[10px] font-mono text-[#484f58]">{entry.meta.duration}ms</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatBox({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="bg-[#0d1117] rounded px-2 py-1.5 text-center">
      <div className={`text-[14px] font-mono font-semibold ${accent ?? 'text-[#e6edf3]'}`}>{value}</div>
      <div className="text-[9px] text-[#484f58] uppercase tracking-wider">{label}</div>
    </div>
  );
}
