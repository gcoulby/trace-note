import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  OsintProvider, ProviderLogEntry, StagedResult, LogLevel,
} from './types';

const PROVIDERS_KEY = 'tracenote_providers_v1';
const LOG_KEY       = 'tracenote_provider_log_v1';
const LOG_CAP       = 500;

function loadProviders(): OsintProvider[] {
  try {
    const raw = localStorage.getItem(PROVIDERS_KEY);
    return raw ? (JSON.parse(raw) as OsintProvider[]) : [];
  } catch { return []; }
}

function loadLog(): ProviderLogEntry[] {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? (JSON.parse(raw) as ProviderLogEntry[]) : [];
  } catch { return []; }
}

function saveProviders(providers: OsintProvider[]) {
  localStorage.setItem(PROVIDERS_KEY, JSON.stringify(providers));
}

function saveLog(log: ProviderLogEntry[]) {
  localStorage.setItem(LOG_KEY, JSON.stringify(log));
}

interface ProviderStoreState {
  providers: OsintProvider[];
  log:       ProviderLogEntry[];
  staged:    StagedResult[];

  addProvider:    (p: Omit<OsintProvider, 'id' | 'createdAt' | 'stats'>) => OsintProvider;
  updateProvider: (id: string, updates: Partial<OsintProvider>) => void;
  deleteProvider: (id: string) => void;

  addLogEntry: (
    providerId:   string,
    providerName: string,
    level:        LogLevel,
    message:      string,
    meta?:        ProviderLogEntry['meta'],
  ) => void;
  clearLog: () => void;

  addStagedResult: (result: Omit<StagedResult, 'id' | 'createdAt' | 'approved' | 'dismissed'>) => void;
  approveStaged:   (id: string) => void;
  dismissStaged:   (id: string) => void;
  clearStaged:     () => void;

  exportConfig: () => OsintProvider[];
}

export const useProviderStore = create<ProviderStoreState>((set, get) => ({
  providers: loadProviders(),
  log:       loadLog(),
  staged:    [],

  addProvider: (p) => {
    const provider: OsintProvider = {
      ...p,
      id:        nanoid(),
      createdAt: Date.now(),
      stats: { requests: 0, errors: 0, nodes: 0, edges: 0, lastRun: null },
    };
    const providers = [...get().providers, provider];
    set({ providers });
    saveProviders(providers);
    return provider;
  },

  updateProvider: (id, updates) => {
    const providers = get().providers.map((p) => p.id === id ? { ...p, ...updates } : p);
    set({ providers });
    saveProviders(providers);
  },

  deleteProvider: (id) => {
    const providers = get().providers.filter((p) => p.id !== id);
    set({ providers });
    saveProviders(providers);
  },

  addLogEntry: (providerId, providerName, level, message, meta = {}) => {
    const entry: ProviderLogEntry = {
      id: nanoid(), providerId, providerName, level, message, meta, ts: Date.now(),
    };

    // Update provider stats
    const providers = get().providers.map((p) => {
      if (p.id !== providerId) return p;
      const stats = { ...p.stats };
      stats.requests++;
      stats.lastRun = Date.now();
      if (level === 'error') stats.errors++;
      if (meta?.nodes)  stats.nodes += meta.nodes;
      if (meta?.edges)  stats.edges += meta.edges;
      return { ...p, stats };
    });

    // Prepend and cap log
    const log = [entry, ...get().log].slice(0, LOG_CAP);
    set({ providers, log });
    saveProviders(providers);
    saveLog(log);
  },

  clearLog: () => {
    set({ log: [] });
    saveLog([]);
  },

  addStagedResult: (result) => {
    const staged: StagedResult = {
      ...result,
      id:        nanoid(),
      createdAt: Date.now(),
      approved:  false,
      dismissed: false,
    };
    set({ staged: [staged, ...get().staged] });
  },

  approveStaged: (id) => {
    set({ staged: get().staged.map((r) => r.id === id ? { ...r, approved: true } : r) });
  },

  dismissStaged: (id) => {
    set({ staged: get().staged.map((r) => r.id === id ? { ...r, dismissed: true } : r) });
  },

  clearStaged: () => {
    set({ staged: [] });
  },

  exportConfig: () => {
    return get().providers.map((p) => ({ ...p, apiKey: '' }));
  },
}));
