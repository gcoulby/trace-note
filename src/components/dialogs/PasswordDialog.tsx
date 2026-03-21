import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

interface Props {
  mode: 'unlock' | 'set';
  filename?: string;
  error?: string;
  onSubmit: (passphrase: string) => void;
  onCancel: () => void;
}

export function PasswordDialog({ mode, filename, error, onSubmit, onCancel }: Props) {
  const [pass, setPass]       = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow]       = useState(false);

  const isSet    = mode === 'set';
  const tooShort = isSet && pass.length > 0 && pass.length < 8;
  const mismatch = isSet && confirm.length > 0 && pass !== confirm;
  const canSubmit = isSet ? (pass.length >= 8 && pass === confirm) : pass.length > 0;

  const submit = () => { if (canSubmit) onSubmit(pass); };

  return (
    <div className="fixed inset-0 bg-[#0d1117]/95 flex items-center justify-center z-50">
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-8 w-[400px] shadow-2xl">
        <div className="flex items-center gap-2.5 mb-5">
          <Lock size={16} className="text-amber-400" />
          <h2 className="text-[#e6edf3] text-base font-semibold">
            {isSet ? 'Encrypt Case File' : 'Encrypted File'}
          </h2>
        </div>

        {filename && (
          <div className="text-[10px] font-mono text-[#6e7681] mb-4 truncate">{filename}</div>
        )}

        <p className="text-[#8b949e] text-sm mb-5 leading-relaxed">
          {isSet
            ? 'Set a passphrase to encrypt this file. You will need it each time you open it.'
            : 'This file is encrypted. Enter the passphrase to open it.'}
        </p>

        <div className="space-y-3 mb-6">
          <div className="relative">
            <input
              autoFocus
              type={show ? 'text' : 'password'}
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              placeholder={isSet ? 'Passphrase (min 8 chars)' : 'Passphrase'}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 pr-9 text-[#e6edf3] text-sm placeholder-[#484f58] focus:outline-none focus:border-amber-400/60"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#484f58] hover:text-[#8b949e]"
            >
              {show ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>

          {isSet && (
            <input
              type={show ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              placeholder="Confirm passphrase"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-[#e6edf3] text-sm placeholder-[#484f58] focus:outline-none focus:border-amber-400/60"
            />
          )}

          {tooShort  && <div className="text-[11px] text-amber-400">Minimum 8 characters</div>}
          {mismatch  && <div className="text-[11px] text-red-400">Passphrases do not match</div>}
          {error     && <div className="text-[11px] text-red-400">{error}</div>}
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-[#8b949e] hover:text-[#e6edf3] transition-colors"
          >
            {isSet ? 'Skip encryption' : 'Cancel'}
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-amber-400 text-[#0d1117] font-semibold rounded hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Lock size={12} />
            {isSet ? 'Encrypt & Create' : 'Unlock'}
          </button>
        </div>
      </div>
    </div>
  );
}
