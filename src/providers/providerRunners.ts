/**
 * providerRunners.ts
 *
 * Executes OSINT provider calls and maps raw API responses into
 * StagedNode[] / StagedEdge[] candidates for graph import.
 *
 * All providers that use exec:'api' are attempted directly from the browser.
 * CORS-blocked responses are caught and surfaced as errors in the log —
 * the user can then route those providers through a local CORS proxy.
 *
 * Providers with exec:'subprocess' / 'browser' / 'local' cannot be invoked
 * from the browser context and will throw immediately with a clear message.
 */

import type { OsintProvider, SeedType, StagedNode, StagedEdge } from './types';
import type { NodeType } from '../types';
import { useSettingsStore } from '../store/settingsStore';

export interface RunResult {
  nodes: StagedNode[];
  edges: StagedEdge[];
}

export type ProviderRunner = (
  provider: OsintProvider,
  seedValue: string,
  seedType: SeedType,
) => Promise<RunResult>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function node(
  label: string,
  nodeType: NodeType,
  opts: Partial<Omit<StagedNode, 'label' | 'nodeType'>> = {},
): StagedNode {
  return {
    label,
    nodeType,
    summary:    opts.summary,
    properties: opts.properties ?? {},
    tags:       opts.tags ?? [],
    confidence: opts.confidence ?? 'high',
  };
}

function edge(sourceLabel: string, targetLabel: string, edgeLabel?: string): StagedEdge {
  return { sourceLabel, targetLabel, edgeLabel };
}

async function apiFetch(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const { proxyUrl } = useSettingsStore.getState();

  if (proxyUrl) {
    const resp = await fetch(`${proxyUrl}/fetch`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ method: 'GET', url, headers }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({})) as { status?: number; error?: string };
      throw new Error(`Proxy error ${err.status ?? resp.status}: ${err.error ?? resp.statusText}`);
    }
    return resp.json();
  }

  // Direct fetch — works for CORS-friendly providers (crt.sh, who-dat)
  const resp = await fetch(url, { headers: { Accept: 'application/json', ...headers } });
  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`HTTP ${resp.status}${body ? `: ${body.slice(0, 200)}` : ''}`);
  }
  return resp.json();
}

// ── crt.sh ───────────────────────────────────────────────────────────────────
// Certificate Transparency search — no auth, CORS-friendly.
// GET https://crt.sh/?q=<domain>&output=json

interface CrtEntry {
  name_value: string;
  common_name: string;
  issuer_name: string;
  not_before: string;
  not_after: string;
}

async function runCrtsh(_provider: OsintProvider, seedValue: string): Promise<RunResult> {
  const data = await apiFetch(
    `https://crt.sh/?q=${encodeURIComponent(seedValue)}&output=json`,
  ) as CrtEntry[];

  if (!Array.isArray(data)) throw new Error('Unexpected response format');

  // Collect unique names from name_value (can be newline-separated SANs)
  const names = new Set<string>();
  data.forEach((e) => {
    e.name_value.split('\n').forEach((n) => {
      const clean = n.trim().replace(/^\*\./, '');
      if (clean && clean !== seedValue && !clean.includes('\0')) {
        names.add(clean);
      }
    });
  });

  const nodes: StagedNode[] = Array.from(names).map((name) =>
    node(name, 'website', {
      summary:    'Subdomain via Certificate Transparency',
      tags:       ['crt.sh', 'subdomain'],
      confidence: 'high',
    }),
  );

  const edges: StagedEdge[] = nodes.map((n) =>
    edge(seedValue, n.label, 'has subdomain'),
  );

  return { nodes, edges };
}

// ── WHOIS (who-dat.as93.net) ─────────────────────────────────────────────────
// CORS-friendly public WHOIS API.
// GET https://who-dat.as93.net/<domain>

interface WhoIs {
  registrant?: { name?: string; organization?: string; email?: string; country?: string };
  administrative?: { name?: string; organization?: string; email?: string };
  technical?: { name?: string; organization?: string; email?: string };
  nameservers?: string[];
  domain?: { created_date?: string; expiration_date?: string; updated_date?: string };
  registrar?: { name?: string; url?: string };
}

async function runWhois(_provider: OsintProvider, seedValue: string): Promise<RunResult> {
  const data = await apiFetch(
    `https://who-dat.as93.net/${encodeURIComponent(seedValue)}`,
  ) as WhoIs;

  const nodes: StagedNode[] = [];
  const edges: StagedEdge[] = [];

  // Registrant
  const reg = data.registrant;
  if (reg) {
    const label = reg.organization || reg.name;
    if (label) {
      nodes.push(node(label, reg.organization ? 'org' : 'person', {
        summary:    'WHOIS registrant',
        properties: {
          email:   reg.email   ?? '',
          country: reg.country ?? '',
        },
        tags: ['whois', 'registrant'],
      }));
      edges.push(edge(label, seedValue, 'registered'));
    }
    if (reg.email && reg.email !== reg.name) {
      nodes.push(node(reg.email, 'email', {
        summary: 'Registrant contact email',
        tags:    ['whois'],
      }));
      if (reg.organization || reg.name) {
        edges.push(edge(reg.organization ?? reg.name!, reg.email, 'contact'));
      }
    }
  }

  // Registrar
  const registrar = data.registrar;
  if (registrar?.name) {
    nodes.push(node(registrar.name, 'org', {
      summary:    'Domain registrar',
      properties: { url: registrar.url ?? '' },
      tags:       ['whois', 'registrar'],
      confidence: 'high',
    }));
    edges.push(edge(registrar.name, seedValue, 'registrar for'));
  }

  // Nameservers
  (data.nameservers ?? []).forEach((ns) => {
    const label = ns.toLowerCase().replace(/\.$/, '');
    nodes.push(node(label, 'website', {
      summary:    'Nameserver',
      tags:       ['whois', 'nameserver'],
    }));
    edges.push(edge(seedValue, label, 'uses nameserver'));
  });

  // Domain dates as properties on a domain node
  if (data.domain) {
    nodes.push(node(seedValue, 'website', {
      summary:    'Queried domain',
      properties: {
        created:   data.domain.created_date    ?? '',
        expires:   data.domain.expiration_date ?? '',
        updated:   data.domain.updated_date    ?? '',
      },
      tags:       ['whois', 'domain'],
    }));
  }

  return { nodes, edges };
}

// ── Shodan ────────────────────────────────────────────────────────────────────
// Requires API key. Direct browser calls will be CORS-blocked by Shodan.
// Included so users can see the query structure and route via a local proxy.
// GET https://api.shodan.io/shodan/host/<ip>?key=<key>  (IP lookup)
// GET https://api.shodan.io/dns/resolve?hostnames=<domain>&key=<key>  (domain→IP)

interface ShodanHost {
  ip_str: string;
  org?: string;
  isp?: string;
  asn?: string;
  os?: string;
  country_name?: string;
  ports?: number[];
  tags?: string[];
  vulns?: string[];
  hostnames?: string[];
  domains?: string[];
}

async function runShodan(
  provider: OsintProvider,
  seedValue: string,
  seedType: SeedType,
): Promise<RunResult> {
  if (!provider.apiKey) throw new Error('Shodan API key is required. Add it in the provider config.');

  const base = provider.endpoint.replace(/\/$/, '');
  const nodes: StagedNode[] = [];
  const edges: StagedEdge[] = [];

  if (seedType === 'domain') {
    // Resolve domain → IPs first
    const resolved = await apiFetch(
      `${base}/dns/resolve?hostnames=${encodeURIComponent(seedValue)}&key=${provider.apiKey}`,
    ) as Record<string, string>;

    for (const [host, ip] of Object.entries(resolved)) {
      nodes.push(node(ip, 'ip', {
        summary:    `IP for ${host}`,
        properties: { hostname: host },
        tags:       ['shodan', 'dns'],
      }));
      edges.push(edge(host || seedValue, ip, 'resolves to'));
    }
    return { nodes, edges };
  }

  // IP lookup
  const data = await apiFetch(
    `${base}/shodan/host/${encodeURIComponent(seedValue)}?key=${provider.apiKey}`,
  ) as ShodanHost;

  const ipLabel = data.ip_str ?? seedValue;
  nodes.push(node(ipLabel, 'ip', {
    summary:    data.org ?? data.isp ?? 'Unknown organisation',
    properties: {
      org:     data.org     ?? '',
      isp:     data.isp     ?? '',
      asn:     data.asn     ?? '',
      os:      data.os      ?? '',
      country: data.country_name ?? '',
      ports:   (data.ports ?? []).join(', '),
      vulns:   (data.vulns ?? []).join(', '),
    },
    tags:       ['shodan', ...(data.tags ?? [])],
  }));

  if (data.org) {
    nodes.push(node(data.org, 'org', {
      summary: `ASN owner of ${ipLabel}`,
      properties: { asn: data.asn ?? '' },
      tags:    ['shodan'],
    }));
    edges.push(edge(data.org, ipLabel, 'owns'));
  }

  (data.hostnames ?? []).forEach((h) => {
    nodes.push(node(h, 'website', { tags: ['shodan', 'hostname'] }));
    edges.push(edge(h, ipLabel, 'resolves to'));
  });

  return { nodes, edges };
}

// ── HaveIBeenPwned ────────────────────────────────────────────────────────────
// Requires API key. hibp-api-key header — will CORS-block without proxy.
// GET https://haveibeenpwned.com/api/v3/breachedaccount/<email>

interface HibpBreach {
  Name: string;
  Title: string;
  Domain: string;
  BreachDate: string;
  DataClasses: string[];
  PwnCount: number;
}

async function runHibp(
  provider: OsintProvider,
  seedValue: string,
): Promise<RunResult> {
  if (!provider.apiKey) throw new Error('HIBP API key is required. Add it in the provider config.');

  const base = provider.endpoint.replace(/\/$/, '');
  const data = await apiFetch(
    `${base}/breachedaccount/${encodeURIComponent(seedValue)}`,
    { 'hibp-api-key': provider.apiKey, 'User-Agent': 'TraceNote-OSINT' },
  ) as HibpBreach[];

  const nodes: StagedNode[] = [];
  const edges: StagedEdge[] = [];

  nodes.push(node(seedValue, 'email', {
    summary:    `Found in ${data.length} breach${data.length !== 1 ? 'es' : ''}`,
    properties: { breach_count: String(data.length) },
    tags:       ['hibp'],
  }));

  data.forEach((b) => {
    const label = b.Title ?? b.Name;
    nodes.push(node(label, 'document', {
      summary:    `Data breach — ${b.BreachDate}`,
      properties: {
        breach_date:  b.BreachDate ?? '',
        domain:       b.Domain ?? '',
        pwn_count:    String(b.PwnCount ?? ''),
        data_classes: (b.DataClasses ?? []).join(', '),
      },
      tags:       ['hibp', 'breach'],
    }));
    edges.push(edge(seedValue, label, 'found in'));
  });

  return { nodes, edges };
}

// ── VirusTotal ────────────────────────────────────────────────────────────────
// Requires API key. Direct browser calls will be CORS-blocked.
// GET https://www.virustotal.com/api/v3/domains/<domain>

interface VtDomain {
  data?: {
    attributes?: {
      last_analysis_stats?: { malicious: number; suspicious: number; harmless: number; undetected: number };
      reputation?: number;
      registrar?: string;
      creation_date?: number;
      last_dns_records?: Array<{ type: string; value: string }>;
      categories?: Record<string, string>;
    };
  };
}

async function runVirustotal(
  provider: OsintProvider,
  seedValue: string,
  seedType: SeedType,
): Promise<RunResult> {
  if (!provider.apiKey) throw new Error('VirusTotal API key is required. Add it in the provider config.');

  const base = provider.endpoint.replace(/\/$/, '');
  const endpoint = seedType === 'ip'     ? `${base}/ip_addresses/${encodeURIComponent(seedValue)}`
                 : seedType === 'hash'   ? `${base}/files/${encodeURIComponent(seedValue)}`
                 : seedType === 'url'    ? `${base}/urls/${btoa(seedValue).replace(/=/g, '')}`
                 :                        `${base}/domains/${encodeURIComponent(seedValue)}`;

  const data = await apiFetch(endpoint, { 'x-apikey': provider.apiKey }) as VtDomain;
  const attrs = data?.data?.attributes ?? {};
  const stats = attrs.last_analysis_stats;

  const nodes: StagedNode[] = [];
  const edges: StagedEdge[] = [];

  const nodeType: NodeType =
    seedType === 'ip'   ? 'ip'
    : seedType === 'hash' ? 'document'
    : 'website';

  nodes.push(node(seedValue, nodeType, {
    summary:    stats
      ? `VT: ${stats.malicious} malicious, ${stats.suspicious} suspicious`
      : 'VirusTotal lookup',
    properties: {
      malicious:  String(stats?.malicious ?? ''),
      suspicious: String(stats?.suspicious ?? ''),
      harmless:   String(stats?.harmless ?? ''),
      reputation: String(attrs.reputation ?? ''),
      registrar:  attrs.registrar ?? '',
    },
    tags: ['virustotal', ...(stats?.malicious ? ['malicious'] : [])],
    confidence: 'high',
  }));

  // DNS records → nodes
  (attrs.last_dns_records ?? []).forEach((r) => {
    if (r.type === 'A' || r.type === 'AAAA') {
      nodes.push(node(r.value, 'ip', { tags: ['virustotal', 'dns'] }));
      edges.push(edge(seedValue, r.value, `${r.type} record`));
    } else if (r.type === 'MX') {
      nodes.push(node(r.value, 'website', { tags: ['virustotal', 'mx'] }));
      edges.push(edge(seedValue, r.value, 'MX record'));
    }
  });

  return { nodes, edges };
}

// ── SpiderFoot ────────────────────────────────────────────────────────────────
// Self-hosted. POST a new scan and poll for results.
// This is a simplified approach: POST /api/v1/scan/ then link to the UI.

async function runSpiderfoot(
  provider: OsintProvider,
  seedValue: string,
  seedType: SeedType,
): Promise<RunResult> {
  const base = provider.endpoint.replace(/\/$/, '');

  // Type map from SeedType to SpiderFoot target type
  const sfTypeMap: Partial<Record<SeedType, string>> = {
    domain:   'INTERNET_NAME',
    ip:       'IP_ADDRESS',
    email:    'EMAILADDR',
    username: 'USERNAME',
  };
  const sfType = sfTypeMap[seedType];
  if (!sfType) throw new Error(`SpiderFoot does not support seed type '${seedType}' in this integration.`);

  // Start a scan
  const formData = new FormData();
  formData.append('scanname',   `TraceNote: ${seedValue}`);
  formData.append('scantarget', seedValue);
  formData.append('targettype', sfType);
  formData.append('usecase',    'all');

  const startResp = await fetch(`${base}/startscan`, { method: 'POST', body: formData });
  if (!startResp.ok) throw new Error(`SpiderFoot start failed: HTTP ${startResp.status}`);

  const startData = await startResp.json() as { id?: string };
  const scanId = startData?.id;
  if (!scanId) throw new Error('SpiderFoot did not return a scan ID');

  // Return a placeholder — user checks SpiderFoot UI for results
  return {
    nodes: [
      node(seedValue, seedType === 'ip' ? 'ip' : 'website', {
        summary:    `SpiderFoot scan started — ID: ${scanId}`,
        properties: {
          scan_id:  scanId,
          sf_url:   `${base}/scaninfo?id=${scanId}`,
        },
        tags: ['spiderfoot', 'scan-pending'],
        confidence: 'low',
      }),
    ],
    edges: [],
  };
}

// ── theHarvester ─────────────────────────────────────────────────────────────
// CLI tool — cannot run from browser. Clear message.

async function runTheHarvester(): Promise<RunResult> {
  throw new Error(
    'theHarvester is a CLI tool and cannot be invoked from the browser. ' +
    'Run it in your terminal: theHarvester -d <domain> -b all, ' +
    'then add results as nodes manually or via a staged import.',
  );
}

// ── Custom provider ───────────────────────────────────────────────────────────
// Generic fetch to the configured endpoint, no response parser.
// Returns raw JSON fields as node properties so the user can inspect the shape.

async function runCustom(
  provider: OsintProvider,
  seedValue: string,
): Promise<RunResult> {
  if (!provider.endpoint) throw new Error('No endpoint configured. Set one in the provider detail form.');

  // Replace {seed} placeholder if present, else append as query param
  const url = provider.endpoint.includes('{seed}')
    ? provider.endpoint.replace('{seed}', encodeURIComponent(seedValue))
    : `${provider.endpoint.replace(/\/$/, '')}/${encodeURIComponent(seedValue)}`;

  const headers: Record<string, string> = {};
  if (provider.apiKey) headers['Authorization'] = `Bearer ${provider.apiKey}`;

  const raw = await apiFetch(url, headers);
  const flat = flattenObject(raw as Record<string, unknown>);

  return {
    nodes: [
      node(seedValue, 'document', {
        summary:    `Raw response from ${provider.name}`,
        properties: flat,
        tags:       [provider.name.toLowerCase().replace(/\s+/g, '-'), 'raw'],
        confidence: 'low',
      }),
    ],
    edges: [],
  };
}

function flattenObject(
  obj: Record<string, unknown>,
  prefix = '',
  depth = 0,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (depth > 3) return out;
  for (const [k, v] of Object.entries(obj ?? {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v === null || v === undefined) continue;
    if (typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flattenObject(v as Record<string, unknown>, key, depth + 1));
    } else {
      out[key] = Array.isArray(v) ? v.join(', ') : String(v);
    }
  }
  return out;
}

// ── Registry ─────────────────────────────────────────────────────────────────

const RUNNERS: Record<string, ProviderRunner> = {
  theHarvester: runTheHarvester,
  shodan:       runShodan,
  whois:        runWhois,
  crtsh:        runCrtsh,
  hibp:         runHibp,
  virustotal:   runVirustotal,
  spiderfoot:   runSpiderfoot,
  custom:       runCustom,
};

export function getRunner(templateId: string | null): ProviderRunner {
  if (templateId && RUNNERS[templateId]) return RUNNERS[templateId];
  // Fall back to custom runner for unknown templates
  return runCustom;
}
