import { useState } from 'react';
import { X, Radar } from 'lucide-react';
import { ProviderList }     from './ProviderList';
import { ProviderDetail }   from './ProviderDetail';
import { ProviderLog }      from './ProviderLog';
import { AddProviderModal } from './AddProviderModal';
import { StagingQueue }     from './StagingQueue';
import { ProviderSettings } from './ProviderSettings';
import { useProviderStore } from '../../providers/providerStore';

type Tab = 'providers' | 'staging' | 'log' | 'settings';

interface Props {
  onClose: () => void;
}

export function ProviderPanel({ onClose }: Props) {
  const [tab, setTab]               = useState<Tab>('providers');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd]       = useState(false);

  const pendingCount = useProviderStore(
    (s) => s.staged.filter((r) => !r.approved && !r.dismissed).length,
  );

  return (
    <>
      <div className="flex flex-col h-full bg-[#161b22] border-l border-[#30363d]" style={{ width: 780 }}>
        {/* Panel header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#30363d] shrink-0">
          <Radar size={13} className="text-amber-400" />
          <span className="text-[11px] uppercase tracking-wider text-amber-400 font-mono">OSINT Providers</span>
          <div className="flex-1" />

          {/* Tab bar */}
          <div className="flex items-center gap-0.5 bg-[#0d1117] rounded p-0.5">
            {([
              ['providers', 'Providers'],
              ['staging',   pendingCount > 0 ? `Staging (${pendingCount})` : 'Staging'],
              ['log',       'Log'],
              ['settings',  'Settings'],
            ] as [Tab, string][]).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-2.5 py-0.5 text-[10px] rounded transition-colors font-mono ${
                  tab === t
                    ? 'bg-[#1c2333] text-amber-400'
                    : 'text-[#484f58] hover:text-[#8b949e]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="p-1 text-[#484f58] hover:text-[#e6edf3] transition-colors rounded"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {tab === 'providers' && (
            <div className="flex h-full">
              {/* Column 1 — list */}
              <div className="w-52 border-r border-[#30363d] overflow-hidden flex flex-col shrink-0">
                <ProviderList
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onAdd={() => setShowAdd(true)}
                />
              </div>
              {/* Column 2 — detail */}
              <div className="flex-1 overflow-hidden">
                <ProviderDetail providerId={selectedId} />
              </div>
            </div>
          )}

          {tab === 'staging' && (
            <StagingQueue />
          )}

          {tab === 'log' && (
            <ProviderLog />
          )}

          {tab === 'settings' && (
            <ProviderSettings />
          )}
        </div>
      </div>

      {showAdd && <AddProviderModal onClose={() => setShowAdd(false)} />}
    </>
  );
}
