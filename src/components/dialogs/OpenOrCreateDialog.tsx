import { useState } from 'react';
import { FolderOpen, FilePlus, Shield, RotateCcw, Lock, Eye, EyeOff } from 'lucide-react';

interface Props {
  onOpen: () => void;
  onCreate: (title: string, passphrase?: string) => void;
  onReopen?: () => void;
  lastFilename?: string | null;
}

export function OpenOrCreateDialog({ onOpen, onCreate, onReopen, lastFilename }: Props) {
  const [mode, setMode] = useState<'choose' | 'create'>('choose');
  const [title, setTitle]       = useState('');
  const [encrypt, setEncrypt]   = useState(false);
  const [pass, setPass]         = useState('');
  const [confirm, setConfirm]   = useState('');
  const [show, setShow]         = useState(false);

  const tooShort  = encrypt && pass.length > 0 && pass.length < 8;
  const mismatch  = encrypt && confirm.length > 0 && pass !== confirm;
  const canCreate = title.trim().length > 0 && (!encrypt || (pass.length >= 8 && pass === confirm));

  const doCreate = () => {
    if (!canCreate) return;
    onCreate(title.trim(), encrypt ? pass : undefined);
  };

  if (mode === 'create') {
    return (
      <div className="fixed inset-0 bg-[#0d1117]/95 flex items-center justify-center z-50">
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-8 w-110 shadow-2xl">
          <h2 className="text-[#e6edf3] text-lg font-semibold mb-6">New Case</h2>

          {/* Title */}
          <div className="mb-4">
            <label className="block text-[11px] uppercase tracking-wider text-[#8b949e] mb-2">Case Title</label>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canCreate) doCreate();
                if (e.key === 'Escape') setMode('choose');
              }}
              placeholder="Operation: Redfield"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-[#e6edf3] text-sm placeholder-[#484f58] focus:outline-none focus:border-amber-400/60"
            />
          </div>

          {/* Encrypt toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer mb-4 select-none">
            <input
              type="checkbox"
              checked={encrypt}
              onChange={(e) => setEncrypt(e.target.checked)}
              className="accent-amber-400"
            />
            <Lock size={12} className={encrypt ? 'text-amber-400' : 'text-[#484f58]'} />
            <span className="text-[12px] text-[#8b949e]">Encrypt with passphrase</span>
          </label>

          {/* Passphrase fields — visible when encrypt is checked */}
          {encrypt && (
            <div className="space-y-2.5 mb-4 pl-5 border-l-2 border-amber-400/20">
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="Passphrase (min 8 chars)"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 pr-9 text-[#e6edf3] text-sm placeholder-[#484f58] focus:outline-none focus:border-amber-400/60"
                />
                <button type="button" onClick={() => setShow((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#484f58] hover:text-[#8b949e]">
                  {show ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
              </div>
              <input
                type={show ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') doCreate(); }}
                placeholder="Confirm passphrase"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-[#e6edf3] text-sm placeholder-[#484f58] focus:outline-none focus:border-amber-400/60"
              />
              {tooShort && <div className="text-[11px] text-amber-400">Minimum 8 characters</div>}
              {mismatch && <div className="text-[11px] text-red-400">Passphrases do not match</div>}
            </div>
          )}

          <div className="flex gap-3 justify-end mt-6">
            <button
              onClick={() => setMode('choose')}
              className="px-4 py-2 text-sm text-[#8b949e] hover:text-[#e6edf3] transition-colors"
            >
              Back
            </button>
            <button
              onClick={doCreate}
              disabled={!canCreate}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-amber-400 text-[#0d1117] font-semibold rounded hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {encrypt && <Lock size={12} />}
              {encrypt ? 'Encrypt & Create' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0d1117] flex items-center justify-center z-50">
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-10 w-120 shadow-2xl">
        <div className="flex items-center gap-3 mb-2">
          <Shield size={20} className="text-amber-400" />
          <span className="text-amber-400 text-xs font-mono uppercase tracking-widest">TraceNote</span>
        </div>
        <h1 className="text-[#e6edf3] text-2xl font-bold mb-2">OSINT Case Board</h1>
        <p className="text-[#8b949e] text-sm mb-8">Privacy-first. Offline. No telemetry.</p>

        {lastFilename && onReopen && (
          <button
            onClick={onReopen}
            className="w-full flex items-center gap-3 px-4 py-3 mb-4 rounded border border-amber-400/30 bg-amber-400/5 hover:bg-amber-400/10 hover:border-amber-400/60 transition-all group text-left"
          >
            <RotateCcw size={16} className="text-amber-400 shrink-0" />
            <div>
              <div className="text-sm font-medium text-amber-400">Continue last session</div>
              <div className="text-[11px] text-[#8b949e] font-mono truncate max-w-85">{lastFilename}</div>
            </div>
          </button>
        )}

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onOpen}
            className="flex flex-col items-center gap-3 p-6 rounded border border-[#30363d] hover:border-amber-400/40 hover:bg-[#1c2333] transition-all group"
          >
            <FolderOpen size={28} className="text-[#8b949e] group-hover:text-amber-400 transition-colors" />
            <span className="text-sm font-medium text-[#e6edf3]">Open Existing</span>
            <span className="text-[11px] text-[#8b949e]">.tnote file</span>
          </button>
          <button
            onClick={() => setMode('create')}
            className="flex flex-col items-center gap-3 p-6 rounded border border-[#30363d] hover:border-amber-400/40 hover:bg-[#1c2333] transition-all group"
          >
            <FilePlus size={28} className="text-[#8b949e] group-hover:text-amber-400 transition-colors" />
            <span className="text-sm font-medium text-[#e6edf3]">New Case</span>
            <span className="text-[11px] text-[#8b949e]">Start fresh</span>
          </button>
        </div>
      </div>
    </div>
  );
}
