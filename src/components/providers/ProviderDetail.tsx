import { useState, useEffect } from 'react';
import { Trash2, Save, Play, Loader2, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { useProviderStore } from '../../providers/providerStore';
import { useGraphStore } from '../../store/graphStore';
import { getRunner } from '../../providers/providerRunners';
import type {
  OsintProvider, ProviderCategory, ExecMode, SeedType, StagedNode, StagedEdge,
} from '../../providers/types';
import type { NodeType } from '../../types';
import { NODE_TYPE_CONFIG } from '../../lib/nodeTypeConfig';

const ALL_SEEDS: SeedType[] = [
  'domain', 'ip', 'email', 'username', 'person', 'org', 'phone', 'hash', 'url', 'keyword',
];
const CATEGORIES: ProviderCategory[] = [
  'network', 'domain', 'person', 'email', 'social', 'geo', 'darkweb', 'custom',
];
const EXEC_MODES: ExecMode[] = ['api', 'subprocess', 'browser', 'local'];

type DetailTab = 'config' | 'run';

type RunStatus = 'idle' | 'running' | 'ok' | 'error';

interface Props {
  providerId: string | null;
}

export function ProviderDetail({ providerId }: Props) {
  const providers      = useProviderStore((s) => s.providers);
  const updateProvider = useProviderStore((s) => s.updateProvider);
  const deleteProvider = useProviderStore((s) => s.deleteProvider);
  const addLogEntry    = useProviderStore((s) => s.addLogEntry);
  const addStaged      = useProviderStore((s) => s.addStagedResult);
  const addNode        = useGraphStore((s) => s.addNode);
  const addEdge        = useGraphStore((s) => s.addEdge);
  const existingNodes  = useGraphStore((s) => s.nodes);

  const provider = providers.find((p) => p.id === providerId) ?? null;

  const proxyUrl    = useSettingsStore((s) => s.proxyUrl);
  const proxyStatus = useSettingsStore((s) => s.proxyStatus);

  const [tab, setTab]               = useState<DetailTab>('config');
  const [form, setForm]             = useState<Omit<OsintProvider, 'id' | 'createdAt' | 'stats'> | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Run state
  const [seedType, setSeedType]   = useState<SeedType | null>(null);
  const [seedValue, setSeedValue] = useState('');
  const [runStatus, setRunStatus] = useState<RunStatus>('idle');
  const [runMessage, setRunMessage] = useState('');
  const [lastResult, setLastResult] = useState<{ nodes: StagedNode[]; edges: StagedEdge[] } | null>(null);

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
    setRunStatus('idle');
    setLastResult(null);
    // Default seed type to first supported
    setSeedType(provider.seeds[0] ?? null);
  }, [providerId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  async function handleRun() {
    if (!seedType || !seedValue.trim() || !provider) return;

    setRunStatus('running');
    setRunMessage('');
    setLastResult(null);

    const t0 = Date.now();

    try {
      const runner = getRunner(provider.templateId);
      const result = await runner(provider, seedValue.trim(), seedType);
      const duration = Date.now() - t0;

      setLastResult(result);
      setRunStatus('ok');

      if (provider.stageResults) {
        // Send to staging queue
        addStaged({
          providerId:   provider.id,
          providerName: provider.name,
          seedValue:    seedValue.trim(),
          seedType,
          nodes:        result.nodes,
          edges:        result.edges,
        });
        const msg = `Staged ${result.nodes.length} node(s), ${result.edges.length} edge(s) from "${seedValue.trim()}"`;
        setRunMessage(msg);
        addLogEntry(provider.id, provider.name, 'success', msg, {
          nodes: result.nodes.length, edges: result.edges.length, duration, seed: seedValue.trim(),
        });
      } else {
        // Commit directly to graph
        const labelToId = new Map<string, string>();
        Object.values(existingNodes).forEach((n) => labelToId.set(n.label.toLowerCase(), n.id));

        for (const sn of result.nodes) {
          const created = addNode({
            label:      sn.label,
            summary:    sn.summary,
            tags:       sn.tags,
            properties: sn.properties,
            nodeType:   sn.nodeType,
            hasContent: false,
          });
          labelToId.set(sn.label.toLowerCase(), created.id);
        }
        for (const se of result.edges) {
          const src = labelToId.get(se.sourceLabel.toLowerCase());
          const tgt = labelToId.get(se.targetLabel.toLowerCase());
          if (src && tgt && src !== tgt) addEdge({ source: src, target: tgt, label: se.edgeLabel });
        }

        const msg = `Committed ${result.nodes.length} node(s), ${result.edges.length} edge(s) from "${seedValue.trim()}"`;
        setRunMessage(msg);
        addLogEntry(provider.id, provider.name, 'success', msg, {
          nodes: result.nodes.length, edges: result.edges.length, duration, seed: seedValue.trim(),
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setRunStatus('error');
      setRunMessage(msg);
      addLogEntry(provider.id, provider.name, 'error', msg, { seed: seedValue.trim() });
    }
  }

  const formatTs = (ms: number | null) =>
    ms ? new Date(ms).toLocaleString() : '—';

  const availableSeeds = provider.seeds.length > 0 ? provider.seeds : ALL_SEEDS;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between shrink-0">
        <span className="text-[11px] font-medium text-[#e6edf3] truncate">{provider.name}</span>
        <div className="flex items-center gap-2">
          {/* Tab switcher */}
          <div className="flex items-center gap-0.5 bg-[#0d1117] rounded p-0.5">
            {(['config', 'run'] as DetailTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-2.5 py-0.5 text-[10px] rounded transition-colors capitalize font-mono ${
                  tab === t ? 'bg-[#1c2333] text-amber-400' : 'text-[#484f58] hover:text-[#8b949e]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'config' && !confirmDelete && (
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
          {tab === 'config' && confirmDelete && (
            <>
              <span className="text-[10px] text-red-400">Confirm?</span>
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
          )}
        </div>
      </div>

      {/* Config tab */}
      {tab === 'config' && (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
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

          {/* Proxy status notice — shown for API providers that aren't CORS-safe */}
          {provider.exec === 'api' && !['crtsh', 'whois'].includes(provider.templateId ?? '') && (
            <div className={`flex items-start gap-2 rounded px-3 py-2 text-[11px] ${
              !proxyUrl
                ? 'bg-amber-400/10 border border-amber-400/20 text-amber-400'
                : proxyStatus === 'ok'
                  ? 'bg-[#3fb950]/10 border border-[#3fb950]/20 text-[#3fb950]'
                  : 'bg-red-400/10 border border-red-400/20 text-red-400'
            }`}>
              <span className="mt-0.5 shrink-0">
                {!proxyUrl ? '⚠' : proxyStatus === 'ok' ? '✓' : '✗'}
              </span>
              <span>
                {!proxyUrl
                  ? 'This provider may be CORS-blocked. Configure a proxy in Settings.'
                  : proxyStatus === 'ok'
                    ? 'Requests will route through your local proxy.'
                    : 'Proxy configured but unreachable — check it is running.'}
              </span>
            </div>
          )}

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
              rows={3}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-[11px] text-[#e6edf3] focus:outline-none focus:border-amber-400/50 resize-none"
            />
          </Field>

          <div className="space-y-2">
            <Toggle label="Enabled"               checked={form.enabled}          onChange={(v) => setForm({ ...form, enabled: v })} />
            <Toggle label="Confirm before run"     checked={form.confirmBeforeRun} onChange={(v) => setForm({ ...form, confirmBeforeRun: v })} />
            <Toggle label="Stage results for review" checked={form.stageResults}  onChange={(v) => setForm({ ...form, stageResults: v })} />
          </div>

          <div className="border-t border-[#30363d] pt-3">
            <div className="text-[10px] uppercase tracking-wider text-[#484f58] font-mono mb-2">Stats</div>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['Requests', provider.stats.requests],
                ['Errors',   provider.stats.errors],
                ['Nodes out', provider.stats.nodes],
                ['Edges out', provider.stats.edges],
              ] as [string, number][]).map(([k, v]) => (
                <div key={k} className="bg-[#0d1117] rounded px-2 py-1.5">
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
      )}

      {/* Run tab */}
      {tab === 'run' && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Exec mode warning for non-API */}
          {provider.exec !== 'api' && (
            <div className="bg-amber-400/10 border border-amber-400/30 rounded px-3 py-2.5 text-[11px] text-amber-400">
              This provider uses exec mode <strong>{provider.exec}</strong>. Runs may fail or produce
              limited output in the browser — see the log for details.
            </div>
          )}

          {/* Seed type */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#484f58] font-mono mb-1.5">
              Seed type
            </div>
            <div className="flex flex-wrap gap-1.5">
              {availableSeeds.map((s) => (
                <button
                  key={s}
                  onClick={() => setSeedType(s)}
                  className={`px-2.5 py-1 text-[11px] rounded border transition-colors ${
                    seedType === s
                      ? 'bg-amber-400/15 border-amber-400/50 text-amber-400'
                      : 'border-[#30363d] text-[#484f58] hover:text-[#8b949e] hover:border-[#8b949e]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Seed value */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#484f58] font-mono mb-1.5">
              Seed value
            </div>
            <div className="flex gap-2">
              <input
                value={seedValue}
                onChange={(e) => setSeedValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && runStatus !== 'running') void handleRun(); }}
                placeholder={
                  seedType === 'domain'   ? 'example.com'
                  : seedType === 'ip'     ? '1.2.3.4'
                  : seedType === 'email'  ? 'user@example.com'
                  : seedType === 'hash'   ? 'sha256 / md5 hash'
                  : seedType === 'url'    ? 'https://...'
                  : seedType ?? 'Enter value...'
                }
                className="flex-1 bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-[11px] text-[#e6edf3] font-mono focus:outline-none focus:border-amber-400/50 placeholder-[#484f58]"
              />
              <button
                onClick={() => void handleRun()}
                disabled={!seedType || !seedValue.trim() || runStatus === 'running'}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-amber-400 text-[#0d1117] rounded hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {runStatus === 'running'
                  ? <><Loader2 size={11} className="animate-spin" /> Running</>
                  : <><Play size={11} /> Run</>}
              </button>
            </div>
            <div className="mt-1 text-[10px] text-[#3a3f47] font-mono">
              Results will be {provider.stageResults ? 'staged for review' : 'committed directly to graph'}
              {' '}· Press Enter to run
            </div>
          </div>

          {/* Run result status */}
          {runStatus === 'ok' && runMessage && (
            <div className="flex items-start gap-2 bg-[#3fb950]/10 border border-[#3fb950]/30 rounded px-3 py-2.5">
              <CheckCircle2 size={13} className="text-[#3fb950] shrink-0 mt-0.5" />
              <span className="text-[11px] text-[#3fb950]">{runMessage}</span>
            </div>
          )}

          {runStatus === 'error' && runMessage && (
            <div className="flex items-start gap-2 bg-red-400/10 border border-red-400/30 rounded px-3 py-2.5">
              <AlertCircle size={13} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-[11px] text-red-400">{runMessage}</div>
                {runMessage.toLowerCase().includes('cors') || runMessage.toLowerCase().includes('failed to fetch') ? (
                  <div className="text-[10px] text-[#8b949e] mt-1">
                    This API blocks direct browser requests. Route it via a local CORS proxy
                    (e.g. <code className="text-amber-400">cors-anywhere</code>) and update the endpoint.
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Preview of last result */}
          {lastResult && runStatus === 'ok' && (
            <div className="border-t border-[#30363d] pt-3 space-y-3">
              <div className="text-[10px] uppercase tracking-wider text-[#484f58] font-mono">
                Result preview
              </div>

              {lastResult.nodes.length === 0 && lastResult.edges.length === 0 && (
                <div className="text-[11px] text-[#484f58]">No entities extracted from the response.</div>
              )}

              {/* Nodes */}
              {lastResult.nodes.length > 0 && (
                <div>
                  <div className="text-[10px] text-[#484f58] mb-1.5">
                    {lastResult.nodes.length} node{lastResult.nodes.length !== 1 ? 's' : ''}
                  </div>
                  <div className="space-y-1">
                    {lastResult.nodes.map((n, i) => {
                      const cfg = NODE_TYPE_CONFIG[n.nodeType as NodeType];
                      return (
                        <div key={i} className="flex items-start gap-2 bg-[#0d1117] rounded px-2.5 py-2">
                          <span
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                            style={{ color: cfg?.color ?? '#8b949e', background: `${cfg?.color ?? '#8b949e'}18` }}
                          >
                            {n.nodeType}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] text-[#e6edf3] font-medium leading-tight">{n.label}</div>
                            {n.summary && (
                              <div className="text-[10px] text-[#484f58] mt-0.5 leading-tight">{n.summary}</div>
                            )}
                            {Object.keys(n.properties).length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {Object.entries(n.properties).filter(([, v]) => v).map(([k, v]) => (
                                  <div key={k} className="flex gap-1 text-[10px] font-mono">
                                    <span className="text-[#484f58] shrink-0">{k}:</span>
                                    <span className="text-[#8b949e] truncate">{v}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded border font-mono shrink-0 ${
                              n.confidence === 'high'   ? 'text-[#3fb950] border-[#3fb950]/30 bg-[#3fb950]/10'
                              : n.confidence === 'medium' ? 'text-amber-400 border-amber-400/30 bg-amber-400/10'
                              : 'text-[#8b949e] border-[#30363d]'
                            }`}
                          >
                            {n.confidence}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Edges */}
              {lastResult.edges.length > 0 && (
                <div>
                  <div className="text-[10px] text-[#484f58] mb-1.5">
                    {lastResult.edges.length} edge{lastResult.edges.length !== 1 ? 's' : ''}
                  </div>
                  <div className="space-y-1">
                    {lastResult.edges.map((e, i) => (
                      <div key={i} className="flex items-center gap-1 text-[10px] font-mono bg-[#0d1117] rounded px-2.5 py-1.5">
                        <span className="text-[#e6edf3] truncate max-w-[35%]">{e.sourceLabel}</span>
                        <ChevronRight size={10} className="text-[#484f58] shrink-0" />
                        {e.edgeLabel && (
                          <span className="text-amber-400/70 shrink-0 italic">{e.edgeLabel}</span>
                        )}
                        <ChevronRight size={10} className="text-[#484f58] shrink-0" />
                        <span className="text-[#e6edf3] truncate max-w-[35%]">{e.targetLabel}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {provider.stageResults && (
                <div className="text-[10px] text-[#484f58] italic">
                  These are staged — review them in the Staging tab before they touch the graph.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-[#484f58] font-mono mb-1">{label}</label>
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
        <span className={`block w-3 h-3 rounded-full bg-white mx-0.5 transition-transform ${checked ? 'translate-x-3' : ''}`} />
      </button>
      <span className="text-[11px] text-[#8b949e]">{label}</span>
    </label>
  );
}
