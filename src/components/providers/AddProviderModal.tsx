import { useState } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { useProviderStore } from '../../providers/providerStore';
import { PROVIDER_TEMPLATES } from '../../providers/providerTemplates';
import type {
  OsintProvider, ProviderCategory, ExecMode, SeedType, ProviderTemplate,
} from '../../providers/types';

const ALL_SEEDS: SeedType[] = [
  'domain', 'ip', 'email', 'username', 'person', 'org', 'phone', 'hash', 'url', 'keyword',
];
const CATEGORIES: ProviderCategory[] = [
  'network', 'domain', 'person', 'email', 'social', 'geo', 'darkweb', 'custom',
];
const EXEC_MODES: ExecMode[] = ['api', 'subprocess', 'browser', 'local'];

type Step = 'template' | 'form';

interface Props {
  onClose: () => void;
}

function blankForm(tpl: ProviderTemplate): Omit<OsintProvider, 'id' | 'createdAt' | 'stats'> {
  return {
    templateId:       tpl.id,
    name:             tpl.name,
    category:         tpl.category,
    exec:             tpl.exec,
    seeds:            [...tpl.seeds],
    endpoint:         tpl.endpoint,
    apiKey:           '',
    rateLimit:        null,
    notes:            '',
    enabled:          true,
    confirmBeforeRun: false,
    stageResults:     true,
  };
}

export function AddProviderModal({ onClose }: Props) {
  const addProvider = useProviderStore((s) => s.addProvider);

  const [step, setStep]     = useState<Step>('template');
  const [form, setForm]     = useState<Omit<OsintProvider, 'id' | 'createdAt' | 'stats'> | null>(null);

  function selectTemplate(tpl: ProviderTemplate) {
    setForm(blankForm(tpl));
    setStep('form');
  }

  function handleSave() {
    if (!form) return;
    addProvider(form);
    onClose();
  }

  function toggleSeed(seed: SeedType) {
    if (!form) return;
    const seeds = form.seeds.includes(seed)
      ? form.seeds.filter((s) => s !== seed)
      : [...form.seeds, seed];
    setForm({ ...form, seeds });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl w-[600px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#30363d] shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-[#484f58] font-mono">
            <span className={step === 'template' ? 'text-amber-400' : ''}>1. Template</span>
            <ChevronRight size={10} />
            <span className={step === 'form' ? 'text-amber-400' : ''}>2. Configure</span>
          </div>
          <button onClick={onClose} className="p-1 text-[#484f58] hover:text-[#e6edf3] transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Step 1 — Template picker */}
        {step === 'template' && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-2">
              {PROVIDER_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => selectTemplate(tpl)}
                  className="text-left p-3 bg-[#0d1117] border border-[#30363d] rounded-md hover:border-amber-400/40 hover:bg-[#1c2333] transition-colors"
                >
                  <div className="text-[12px] font-medium text-[#e6edf3]">{tpl.name}</div>
                  <div className="text-[10px] text-[#484f58] mt-0.5 capitalize">{tpl.category} · {tpl.exec}</div>
                  <div className="text-[10px] text-[#8b949e] mt-1.5 leading-tight">{tpl.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Form */}
        {step === 'form' && form && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <Field label="Name">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-[11px] text-[#e6edf3] focus:outline-none focus:border-amber-400/50"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as ProviderCategory })}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-[11px] text-[#e6edf3] focus:outline-none focus:border-amber-400/50"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Exec mode">
                <select
                  value={form.exec}
                  onChange={(e) => setForm({ ...form, exec: e.target.value as ExecMode })}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-[11px] text-[#e6edf3] focus:outline-none focus:border-amber-400/50"
                >
                  {EXEC_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Seed types">
              <div className="flex flex-wrap gap-1.5 mt-1">
                {ALL_SEEDS.map((s) => (
                  <button
                    key={s}
                    onClick={() => toggleSeed(s)}
                    className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                      form.seeds.includes(s)
                        ? 'bg-amber-400/15 border-amber-400/40 text-amber-400'
                        : 'bg-transparent border-[#30363d] text-[#484f58] hover:border-[#8b949e] hover:text-[#8b949e]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Endpoint">
              <input
                value={form.endpoint}
                onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-[11px] text-[#e6edf3] font-mono focus:outline-none focus:border-amber-400/50"
                placeholder="https://api.example.com"
              />
            </Field>

            <Field label="API Key — stored locally only">
              <input
                type="password"
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-[11px] text-[#e6edf3] font-mono focus:outline-none focus:border-amber-400/50"
                placeholder="••••••••"
              />
            </Field>

            <Field label="Rate limit (req/min, blank = unlimited)">
              <input
                type="number"
                min={1}
                value={form.rateLimit ?? ''}
                onChange={(e) => setForm({ ...form, rateLimit: e.target.value ? Number(e.target.value) : null })}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-[11px] text-[#e6edf3] focus:outline-none focus:border-amber-400/50"
              />
            </Field>

            <Field label="Notes">
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-[11px] text-[#e6edf3] focus:outline-none focus:border-amber-400/50 resize-none"
              />
            </Field>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#30363d] shrink-0">
          <button
            onClick={step === 'form' ? () => setStep('template') : onClose}
            className="px-3 py-1 text-[11px] text-[#8b949e] border border-[#30363d] rounded hover:bg-[#1c2333] transition-colors"
          >
            {step === 'form' ? 'Back' : 'Cancel'}
          </button>
          {step === 'form' && (
            <button
              onClick={handleSave}
              disabled={!form?.name}
              className="px-4 py-1 text-[11px] text-[#0d1117] bg-amber-400 rounded hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Add Provider
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-[#484f58] font-mono mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
