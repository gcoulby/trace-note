import { useState, useEffect } from 'react';
import { Trash2, Save } from 'lucide-react';
import { useProviderStore } from '../../providers/providerStore';
import type {
  OsintProvider, ProviderCategory, ExecMode, SeedType,
} from '../../providers/types';

const ALL_SEEDS: SeedType[] = [
  'domain', 'ip', 'email', 'username', 'person', 'org', 'phone', 'hash', 'url', 'keyword',
];

const CATEGORIES: ProviderCategory[] = [
  'network', 'domain', 'person', 'email', 'social', 'geo', 'darkweb', 'custom',
];

const EXEC_MODES: ExecMode[] = ['api', 'subprocess', 'browser', 'local'];

interface Props {
  providerId: string | null;
}

export function ProviderDetail({ providerId }: Props) {
  const providers      = useProviderStore((s) => s.providers);
  const updateProvider = useProviderStore((s) => s.updateProvider);
  const deleteProvider = useProviderStore((s) => s.deleteProvider);

  const provider = providers.find((p) => p.id === providerId) ?? null;

  const [form, setForm] = useState<Omit<OsintProvider, 'id' | 'createdAt' | 'stats'> | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!provider) { setForm(null); setConfirmDelete(false); return; }
    setForm({
      templateId:       provider.templateId,
      name:             provider.name,
      category:         provider.category,
      exec:             provider.exec,
      seeds:            [...provider.seeds],
      endpoint:         provider.endpoint,
      apiKey:           provider.apiKey,
      rateLimit:        provider.rateLimit,
      notes:            provider.notes,
      enabled:          provider.enabled,
      confirmBeforeRun: provider.confirmBeforeRun,
      stageResults:     provider.stageResults,
    });
    setConfirmDelete(false);
  }, [providerId, provider?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!provider || !form) {
    return (
      <div className="flex items-center justify-center h-full text-[11px] text-[#484f58]">
        Select a provider to edit
      </div>
    );
  }

  function toggleSeed(seed: SeedType) {
    if (!form) return;
    const seeds = form.seeds.includes(seed)
      ? form.seeds.filter((s) => s !== seed)
      : [...form.seeds, seed];
    setForm({ ...form, seeds });
  }

  function handleSave() {
    if (!providerId || !form) return;
    updateProvider(providerId, form);
  }

  function handleDelete() {
    if (!providerId) return;
    deleteProvider(providerId);
  }

  const formatTs = (ms: number | null) =>
    ms ? new Date(ms).toLocaleString() : '—';

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between shrink-0">
        <span className="text-[11px] font-medium text-[#e6edf3] truncate">{provider.name}</span>
        <div className="flex items-center gap-1">
          {confirmDelete ? (
            <>
              <span className="text-[10px] text-red-400 mr-1">Confirm?</span>
              <button
                onClick={handleDelete}
                className="px-2 py-0.5 text-[10px] text-red-400 border border-red-400/30 rounded hover:bg-red-400/10 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-0.5 text-[10px] text-[#8b949e] border border-[#30363d] rounded hover:bg-[#1c2333] transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSave}
                className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-amber-400 border border-amber-400/30 rounded hover:bg-amber-400/10 transition-colors"
              >
                <Save size={10} /> Save
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1 text-[#484f58] hover:text-red-400 transition-colors rounded"
              >
                <Trash2 size={12} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 px-4 py-3 space-y-4">
        {/* Name */}
        <Field label="Name">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-[11px] text-[#e6edf3] focus:outline-none focus:border-amber-400/50"
          />
        </Field>

        {/* Category + Exec */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as ProviderCategory })}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-[11px] text-[#e6edf3] focus:outline-none focus:border-amber-400/50"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Exec mode">
            <select
              value={form.exec}
              onChange={(e) => setForm({ ...form, exec: e.target.value as ExecMode })}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-[11px] text-[#e6edf3] focus:outline-none focus:border-amber-400/50"
            >
              {EXEC_MODES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* Seed types */}
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

        {/* Endpoint */}
        <Field label="Endpoint">
          <input
            value={form.endpoint}
            onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-[11px] text-[#e6edf3] font-mono focus:outline-none focus:border-amber-400/50"
            placeholder="https://api.example.com"
          />
        </Field>

        {/* API Key */}
        <Field label="API Key — stored locally only">
          <input
            type="password"
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-[11px] text-[#e6edf3] font-mono focus:outline-none focus:border-amber-400/50"
            placeholder="••••••••"
          />
        </Field>

        {/* Rate limit */}
        <Field label="Rate limit (req/min, blank = unlimited)">
          <input
            type="number"
            min={1}
            value={form.rateLimit ?? ''}
            onChange={(e) => setForm({ ...form, rateLimit: e.target.value ? Number(e.target.value) : null })}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-[11px] text-[#e6edf3] focus:outline-none focus:border-amber-400/50"
          />
        </Field>

        {/* Notes */}
        <Field label="Notes">
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-[11px] text-[#e6edf3] focus:outline-none focus:border-amber-400/50 resize-none"
          />
        </Field>

        {/* Toggles */}
        <div className="space-y-2">
          <Toggle
            label="Enabled"
            checked={form.enabled}
            onChange={(v) => setForm({ ...form, enabled: v })}
          />
          <Toggle
            label="Confirm before run"
            checked={form.confirmBeforeRun}
            onChange={(v) => setForm({ ...form, confirmBeforeRun: v })}
          />
          <Toggle
            label="Stage results for review"
            checked={form.stageResults}
            onChange={(v) => setForm({ ...form, stageResults: v })}
          />
        </div>

        {/* Stats */}
        <div className="border-t border-[#30363d] pt-3">
          <div className="text-[10px] uppercase tracking-wider text-[#484f58] font-mono mb-2">Stats</div>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Requests', provider.stats.requests],
              ['Errors',   provider.stats.errors],
              ['Nodes out', provider.stats.nodes],
              ['Edges out', provider.stats.edges],
            ].map(([k, v]) => (
              <div key={String(k)} className="bg-[#0d1117] rounded px-2 py-1.5">
                <div className="text-[10px] text-[#484f58]">{k}</div>
                <div className="text-[13px] font-mono text-[#e6edf3]">{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[10px] text-[#484f58] font-mono">
            Last run: {formatTs(provider.stats.lastRun)}
          </div>
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

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-7 h-4 rounded-full transition-colors ${checked ? 'bg-amber-400' : 'bg-[#30363d]'}`}
      >
        <span
          className={`block w-3 h-3 rounded-full bg-white mx-0.5 transition-transform ${checked ? 'translate-x-3' : ''}`}
        />
      </button>
      <span className="text-[11px] text-[#8b949e]">{label}</span>
    </label>
  );
}
