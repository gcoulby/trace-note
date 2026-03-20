import { X, Shield, Lock, Keyboard, FileArchive, Layers } from 'lucide-react'

interface Props {
  onClose: () => void
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-amber-400">{icon}</span>
        <h3 className="font-mono text-[11px] text-amber-400 uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function KbRow({ keys, action }: { keys: string[]; action: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-[#21262d] last:border-0 border-b">
      <span className="text-[#8b949e] text-[11px]">{action}</span>
      <div className="flex gap-1">
        {keys.map((k) => (
          <kbd key={k} className="bg-[#21262d] px-1.5 py-0.5 border border-[#30363d] rounded font-mono text-[#e6edf3] text-[10px]">
            {k}
          </kbd>
        ))}
      </div>
    </div>
  )
}

export function InfoPanel({ onClose }: Props) {
  return (
    <div className="z-50 fixed inset-0 flex justify-center items-center bg-[#0d1117]/80 p-4">
      <div className="flex flex-col bg-[#161b22] shadow-2xl border border-[#30363d] rounded-lg w-full max-w-[600px] max-h-[85vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-[#30363d] border-b shrink-0">
          <div className="flex items-center gap-3">
            <Shield size={18} className="text-amber-400" />
            <div>
              <div className="font-bold text-[#e6edf3] text-sm">TraceNote</div>
              <div className="font-mono text-[#8b949e] text-[10px]">OSINT Case Board · v1.0</div>
            </div>
          </div>
          <button onClick={onClose} className="text-[#8b949e] hover:text-[#e6edf3]">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 px-6 py-5 overflow-y-auto">
          <Section icon={<Layers size={14} />} title="What is TraceNote?">
            <p className="text-[#8b949e] text-[12px] leading-relaxed">
              TraceNote is a spatial evidence board for OSINT investigations. You build a graph of entities (people, organisations, locations, events,
              documents) and the relationships between them — all stored in a single{' '}
              <code className="bg-[#21262d] px-1 rounded text-amber-400">.tnote</code> file on your disk.
            </p>
            <p className="mt-2 text-[#8b949e] text-[12px] leading-relaxed">
              Think of it as a digital version of the detective's evidence board: nodes are index cards, edges are the red threads between them.
            </p>
          </Section>

          <Section icon={<Lock size={14} />} title="Privacy & Security">
            <div className="space-y-2 text-[#8b949e] text-[12px]">
              <div className="flex gap-2">
                <span className="mt-0.5 text-amber-400 shrink-0">→</span>
                <span>
                  <strong className="text-[#e6edf3]">Fully offline.</strong> Zero network requests at runtime. No analytics, no telemetry, no CDN
                  calls.
                </span>
              </div>
              <div className="flex gap-2">
                <span className="mt-0.5 text-amber-400 shrink-0">→</span>
                <span>
                  <strong className="text-[#e6edf3]">Single-file storage.</strong> Everything lives in the{' '}
                  <code className="bg-[#21262d] px-1 rounded text-amber-400">.tnote</code> file — a ZIP archive you control.
                </span>
              </div>
              <div className="flex gap-2">
                <span className="mt-0.5 text-amber-400 shrink-0">→</span>
                <span>
                  <strong className="text-[#e6edf3]">No cloud.</strong> No accounts, no sync services, no external dependencies at runtime.
                </span>
              </div>
              <div className="flex gap-2">
                <span className="mt-0.5 text-amber-400 shrink-0">→</span>
                <span>
                  <strong className="text-[#e6edf3]">USB-safe.</strong> The app can run as a static bundle from a USB stick or local file server.
                </span>
              </div>
              <div className="flex gap-2 bg-amber-400/5 mt-3 p-3 border border-amber-400/20 rounded">
                <span className="mt-0.5 text-amber-400 shrink-0">⚠</span>
                <span>
                  <strong className="text-amber-400">Note:</strong> The <code className="bg-[#21262d] px-1 rounded text-amber-400">.tnote</code> file
                  is NOT encrypted in v1. Treat it like any other sensitive document — store on an encrypted drive and restrict access accordingly.
                  Encryption is planned for v2.
                </span>
              </div>
            </div>
          </Section>

          <Section icon={<Keyboard size={14} />} title="Keyboard Shortcuts">
            <div className="bg-[#0d1117] p-3 border border-[#30363d] rounded">
              <KbRow keys={['Ctrl', 'K']} action="Open search" />
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
            <p className="mb-2 text-[#8b949e] text-[12px] leading-relaxed">
              A <code className="bg-[#21262d] px-1 rounded text-amber-400">.tnote</code> file is a standard ZIP archive containing:
            </p>
            <div className="space-y-1 bg-[#0d1117] p-3 border border-[#30363d] rounded font-mono text-[#8b949e] text-[11px]">
              <div>
                <span className="text-[#3fb950]">manifest.json</span> — schema version, case title, timestamps
              </div>
              <div>
                <span className="text-[#3fb950]">graph.json</span> — all nodes and edges
              </div>
              <div>
                <span className="text-[#3fb950]">canvas.json</span> — node positions, viewport state
              </div>
              <div>
                <span className="text-[#3fb950]">assets/</span> — thumbnails, attached images and PDFs
              </div>
              <div>
                <span className="text-[#3fb950]">content/</span> — rich text content per node (future)
              </div>
            </div>
            <p className="mt-2 text-[#484f58] text-[11px]">
              You can unzip and inspect a <code className="text-amber-400">.tnote</code> file with any standard archive tool.
            </p>
          </Section>
        </div>

        <div className="px-6 py-3 border-[#30363d] border-t text-center shrink-0">
          <button
            onClick={onClose}
            className="bg-amber-400 hover:bg-amber-300 px-6 py-1.5 rounded font-semibold text-[#0d1117] text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
