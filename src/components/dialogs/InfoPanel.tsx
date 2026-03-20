import { X, Shield, Lock, Keyboard, FileArchive, Layers } from 'lucide-react';

interface Props {
  onClose: () => void;
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-amber-400">{icon}</span>
        <h3 className="text-[11px] uppercase tracking-wider text-amber-400 font-mono">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function KbRow({ keys, action }: { keys: string[]; action: string }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-[#21262d] last:border-0">
      <span className="text-[11px] text-[#8b949e]">{action}</span>
      <div className="flex gap-1">
        {keys.map((k) => (
          <kbd key={k} className="px-1.5 py-0.5 text-[10px] bg-[#21262d] border border-[#30363d] rounded font-mono text-[#e6edf3]">
            {k}
          </kbd>
        ))}
      </div>
    </div>
  );
}

export function InfoPanel({ onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-[#0d1117]/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl w-full max-w-[600px] max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363d] shrink-0">
          <div className="flex items-center gap-3">
            <Shield size={18} className="text-amber-400" />
            <div>
              <div className="text-sm font-bold text-[#e6edf3]">TraceNote</div>
              <div className="text-[10px] text-[#8b949e] font-mono">OSINT Case Board · v1.0</div>
            </div>
          </div>
          <button onClick={onClose} className="text-[#8b949e] hover:text-[#e6edf3]">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">

          <Section icon={<Layers size={14} />} title="What is TraceNote?">
            <p className="text-[12px] text-[#8b949e] leading-relaxed">
              TraceNote is a spatial evidence board for OSINT investigations. You build a graph of
              entities (people, organisations, locations, events, documents) and the relationships
              between them — all stored in a single <code className="text-amber-400 bg-[#21262d] px-1 rounded">.tnote</code> file on your disk.
            </p>
            <p className="text-[12px] text-[#8b949e] leading-relaxed mt-2">
              Think of it as a digital version of the detective's evidence board: nodes are index
              cards, edges are the red threads between them.
            </p>
          </Section>

          <Section icon={<Lock size={14} />} title="Privacy & Security">
            <div className="space-y-2 text-[12px] text-[#8b949e]">
              <div className="flex gap-2">
                <span className="text-amber-400 shrink-0 mt-0.5">→</span>
                <span><strong className="text-[#e6edf3]">Fully offline.</strong> Zero network requests at runtime. No analytics, no telemetry, no CDN calls.</span>
              </div>
              <div className="flex gap-2">
                <span className="text-amber-400 shrink-0 mt-0.5">→</span>
                <span><strong className="text-[#e6edf3]">Single-file storage.</strong> Everything lives in the <code className="text-amber-400 bg-[#21262d] px-1 rounded">.tnote</code> file — a ZIP archive you control.</span>
              </div>
              <div className="flex gap-2">
                <span className="text-amber-400 shrink-0 mt-0.5">→</span>
                <span><strong className="text-[#e6edf3]">No cloud.</strong> No accounts, no sync services, no external dependencies at runtime.</span>
              </div>
              <div className="flex gap-2">
                <span className="text-amber-400 shrink-0 mt-0.5">→</span>
                <span><strong className="text-[#e6edf3]">USB-safe.</strong> The app can run as a static bundle from a USB stick or local file server.</span>
              </div>
              <div className="flex gap-2 mt-3 p-3 rounded bg-amber-400/5 border border-amber-400/20">
                <span className="text-amber-400 shrink-0 mt-0.5">⚠</span>
                <span><strong className="text-amber-400">Note:</strong> The <code className="text-amber-400 bg-[#21262d] px-1 rounded">.tnote</code> file is NOT encrypted in v1. Treat it like any other sensitive document — store on an encrypted drive and restrict access accordingly. Encryption is planned for v2.</span>
              </div>
            </div>
          </Section>

          <Section icon={<Keyboard size={14} />} title="Keyboard Shortcuts">
            <div className="bg-[#0d1117] rounded border border-[#30363d] p-3">
              <KbRow keys={['/']} action="Open search" />
              <KbRow keys={['Ctrl', 'K']} action="Open search (alt)" />
              <KbRow keys={['Esc']} action="Close panel / dismiss" />
              <KbRow keys={['Del']} action="Delete selected node" />
              <KbRow keys={['Double-click', 'canvas']} action="Add node at position" />
              <KbRow keys={['Double-click', 'node']} action="Open node panel" />
              <KbRow keys={['Right-click']} action="Context menu" />
              <KbRow keys={['Drag', 'handle']} action="Connect nodes" />
              <KbRow keys={['Drag to', 'empty']} action="Create connected node" />
              <KbRow keys={['Ctrl', 'A']} action="Select all nodes" />
            </div>
          </Section>

          <Section icon={<FileArchive size={14} />} title="File Format">
            <p className="text-[12px] text-[#8b949e] leading-relaxed mb-2">
              A <code className="text-amber-400 bg-[#21262d] px-1 rounded">.tnote</code> file is a standard ZIP archive containing:
            </p>
            <div className="bg-[#0d1117] rounded border border-[#30363d] p-3 font-mono text-[11px] text-[#8b949e] space-y-1">
              <div><span className="text-[#3fb950]">manifest.json</span> — schema version, case title, timestamps</div>
              <div><span className="text-[#3fb950]">graph.json</span>    — all nodes and edges</div>
              <div><span className="text-[#3fb950]">canvas.json</span>   — node positions, viewport state</div>
              <div><span className="text-[#3fb950]">assets/</span>       — thumbnails, attached images and PDFs</div>
              <div><span className="text-[#3fb950]">content/</span>      — rich text content per node (future)</div>
            </div>
            <p className="text-[11px] text-[#484f58] mt-2">
              You can unzip and inspect a <code className="text-amber-400">.tnote</code> file with any standard archive tool.
            </p>
          </Section>

        </div>

        <div className="px-6 py-3 border-t border-[#30363d] shrink-0 text-center">
          <button
            onClick={onClose}
            className="px-6 py-1.5 text-sm bg-amber-400 text-[#0d1117] font-semibold rounded hover:bg-amber-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
