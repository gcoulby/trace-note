import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronDown, ChevronRight, Download, RefreshCw,
  CheckCircle2, AlertCircle, Loader2, Circle,
} from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';

// ── Proxy source (inlined so the file is downloadable with no server) ─────────

const PROXY_SOURCE = `"""
TraceNote local CORS proxy.

Forwards HTTP requests from the TraceNote browser app to OSINT APIs
that block direct browser requests via CORS (Shodan, HIBP, VirusTotal, etc.).

Usage:
    pip install fastapi uvicorn httpx
    uvicorn proxy:app --port 8765

Then set the Proxy URL in TraceNote's Providers → Settings tab to:
    http://localhost:8765

No data is stored or logged. The proxy only runs locally.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx

app = FastAPI(title="TraceNote Proxy", docs_url=None, redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"ok": True}


@app.post("/fetch")
async def proxy_fetch(req: Request):
    body    = await req.json()
    method  = body.get("method", "GET").upper()
    url     = body.get("url", "")
    headers = body.get("headers", {})

    if not url:
        return JSONResponse({"error": "url is required"}, status_code=400)

    async with httpx.AsyncClient(timeout=20) as client:
        try:
            r = await client.request(method, url, headers=headers)
            try:
                return r.json()
            except Exception:
                return JSONResponse(
                    {"error": "non-JSON response", "body": r.text[:500]},
                    status_code=502,
                )
        except httpx.RequestError as e:
            return JSONResponse({"error": str(e)}, status_code=502)
`;

function downloadProxy() {
  const blob = new Blob([PROXY_SOURCE], { type: 'text/x-python' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'proxy.py';
  a.click();
  URL.revokeObjectURL(url);
}

// ── Health check ──────────────────────────────────────────────────────────────

async function checkHealth(proxyUrl: string): Promise<boolean> {
  try {
    const resp = await fetch(`${proxyUrl}/health`, { signal: AbortSignal.timeout(4000) });
    if (!resp.ok) return false;
    const data = await resp.json() as { ok?: boolean };
    return data.ok === true;
  } catch {
    return false;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProviderSettings() {
  const proxyUrl    = useSettingsStore((s) => s.proxyUrl);
  const proxyStatus = useSettingsStore((s) => s.proxyStatus);
  const setProxyUrl    = useSettingsStore((s) => s.setProxyUrl);
  const setProxyStatus = useSettingsStore((s) => s.setProxyStatus);

  const [input, setInput]         = useState(proxyUrl);
  const [checking, setChecking]   = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runCheck = useCallback(async (url: string) => {
    if (!url) { setProxyStatus('unchecked'); return; }
    setChecking(true);
    const ok = await checkHealth(url);
    setProxyStatus(ok ? 'ok' : 'unreachable');
    setChecking(false);
  }, [setProxyStatus]);

  // Run check on mount if a URL is already set
  useEffect(() => {
    if (proxyUrl) void runCheck(proxyUrl);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce URL changes
  function handleInputChange(val: string) {
    setInput(val);
    setProxyUrl(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void runCheck(val.replace(/\/$/, '')), 600);
  }

  // Status indicator
  function StatusDot() {
    if (!input) {
      return (
        <span className="flex items-center gap-1.5 text-[10px] text-[#484f58]">
          <Circle size={8} className="fill-[#484f58] text-[#484f58]" /> Not configured
        </span>
      );
    }
    if (checking) {
      return (
        <span className="flex items-center gap-1.5 text-[10px] text-amber-400">
          <Loader2 size={10} className="animate-spin" /> Checking…
        </span>
      );
    }
    if (proxyStatus === 'ok') {
      return (
        <span className="flex items-center gap-1.5 text-[10px] text-[#3fb950]">
          <CheckCircle2 size={10} /> Connected
        </span>
      );
    }
    if (proxyStatus === 'unreachable') {
      return (
        <span className="flex items-center gap-1.5 text-[10px] text-red-400">
          <AlertCircle size={10} /> Unreachable
        </span>
      );
    }
    return null;
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto px-5 py-5 space-y-6">

      {/* Section: Proxy */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-[#484f58] font-mono mb-3">
          Proxy
        </div>

        <div className="space-y-2">
          <label className="block text-[10px] uppercase tracking-wider text-[#484f58] font-mono">
            Proxy URL
          </label>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="http://localhost:8765"
              className="flex-1 bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-[11px] text-[#e6edf3] font-mono focus:outline-none focus:border-amber-400/50 placeholder-[#484f58]"
            />
            <button
              onClick={() => void runCheck(input.replace(/\/$/, ''))}
              disabled={!input || checking}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] text-[#8b949e] border border-[#30363d] rounded hover:text-amber-400 hover:border-amber-400/30 disabled:opacity-40 transition-colors"
              title="Test connection"
            >
              <RefreshCw size={11} className={checking ? 'animate-spin' : ''} />
              Test
            </button>
          </div>

          <div className="flex items-center justify-between">
            <StatusDot />
            <span className="text-[10px] text-[#3a3f47] font-mono">Saved with case file</span>
          </div>
        </div>

        <div className="mt-3 text-[11px] text-[#484f58] leading-relaxed">
          Route all provider requests through a local proxy to bypass CORS restrictions.
          Required for Shodan, HIBP, VirusTotal, and any API that blocks direct browser calls.
          Leave blank to use direct requests (crt.sh, WHOIS, SpiderFoot work without a proxy).
        </div>
      </div>

      {/* Section: Proxy script */}
      <div className="border-t border-[#30363d] pt-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] uppercase tracking-wider text-[#484f58] font-mono">
            Proxy script
          </div>
          <button
            onClick={downloadProxy}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] text-amber-400 border border-amber-400/30 rounded hover:bg-amber-400/10 transition-colors"
          >
            <Download size={11} /> Download proxy.py
          </button>
        </div>

        <div className="bg-[#0d1117] border border-[#30363d] rounded px-3 py-3 space-y-2">
          <p className="text-[11px] text-[#8b949e]">
            A lightweight Python relay. Runs entirely on your machine — nothing is stored or forwarded anywhere except the target API.
          </p>

          {/* Install & run instructions */}
          <div className="mt-2 space-y-1.5">
            <div className="text-[10px] text-[#484f58] uppercase tracking-wider font-mono">Install</div>
            <CodeBlock>pip install fastapi uvicorn httpx</CodeBlock>
            <div className="text-[10px] text-[#484f58] uppercase tracking-wider font-mono mt-2">Run</div>
            <CodeBlock>uvicorn proxy:app --port 8765</CodeBlock>
          </div>
        </div>

        {/* Collapsible: full setup explanation */}
        <button
          onClick={() => setSetupOpen((v) => !v)}
          className="flex items-center gap-1.5 mt-3 text-[10px] text-[#484f58] hover:text-[#8b949e] transition-colors"
        >
          {setupOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          Full setup instructions
        </button>

        {setupOpen && (
          <div className="mt-3 space-y-4 text-[11px] text-[#8b949e] leading-relaxed">
            <div>
              <div className="text-[10px] font-mono text-[#484f58] uppercase tracking-wider mb-1">1. Download the script</div>
              <p>Click <strong className="text-[#e6edf3]">Download proxy.py</strong> above and save it anywhere on your machine.</p>
            </div>
            <div>
              <div className="text-[10px] font-mono text-[#484f58] uppercase tracking-wider mb-1">2. Install dependencies</div>
              <CodeBlock>pip install fastapi uvicorn httpx</CodeBlock>
              <p className="mt-1">Requires Python 3.9+. One-time install.</p>
            </div>
            <div>
              <div className="text-[10px] font-mono text-[#484f58] uppercase tracking-wider mb-1">3. Start the proxy</div>
              <CodeBlock>uvicorn proxy:app --port 8765</CodeBlock>
              <p className="mt-1">
                Run this from the directory where you saved <code className="text-amber-400">proxy.py</code>.
                Keep the terminal open while using TraceNote.
              </p>
            </div>
            <div>
              <div className="text-[10px] font-mono text-[#484f58] uppercase tracking-wider mb-1">4. Set the proxy URL</div>
              <p>
                Enter <code className="text-amber-400 font-mono">http://localhost:8765</code> in the Proxy URL field above.
                The status dot will turn green when TraceNote can reach it.
              </p>
            </div>
            <div>
              <div className="text-[10px] font-mono text-[#484f58] uppercase tracking-wider mb-1">How it works</div>
              <p>
                TraceNote sends a <code className="text-amber-400 font-mono">POST /fetch</code> request to the proxy containing
                the target URL and any auth headers. The proxy makes the outbound request and returns the JSON response.
                No data is stored. The proxy only accepts connections from localhost.
              </p>
            </div>
            <div>
              <div className="text-[10px] font-mono text-[#484f58] uppercase tracking-wider mb-1">Which providers need it</div>
              <table className="w-full text-[10px] font-mono border-collapse mt-1">
                <tbody>
                  {[
                    ['crt.sh',        'No',  'CORS-friendly'],
                    ['WHOIS',         'No',  'CORS-friendly'],
                    ['SpiderFoot',    'No',  'Self-hosted'],
                    ['Shodan',        'Yes', 'CORS-blocked'],
                    ['HaveIBeenPwnd', 'Yes', 'CORS-blocked'],
                    ['VirusTotal',    'Yes', 'CORS-blocked'],
                    ['theHarvester',  '—',   'CLI only'],
                  ].map(([name, proxy, note]) => (
                    <tr key={name} className="border-b border-[#30363d]/50">
                      <td className="py-1 pr-3 text-[#e6edf3]">{name}</td>
                      <td className={`py-1 pr-3 ${proxy === 'Yes' ? 'text-amber-400' : proxy === 'No' ? 'text-[#3fb950]' : 'text-[#484f58]'}`}>{proxy}</td>
                      <td className="py-1 text-[#484f58]">{note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 font-mono text-[11px] text-amber-400 select-all">
      {children}
    </div>
  );
}
