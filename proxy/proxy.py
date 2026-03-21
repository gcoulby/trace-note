"""
TraceNote local proxy.

Two responsibilities:
  1. HTTP relay  — POST /fetch  — forwards browser requests to CORS-blocked APIs.
  2. Subprocess  — POST /exec   — runs allowlisted CLI tools and returns stdout/stderr.

Usage:
    pip install fastapi uvicorn httpx
    uvicorn proxy:app --port 8765

Set the Proxy URL in TraceNote → Providers → Settings to http://localhost:8765

Nothing is stored or logged. All connections are local-only.
"""

import subprocess
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx

# ── Subprocess allowlist ──────────────────────────────────────────────────────
#
# Only executables listed here can be invoked via POST /exec.
# Add your own tools as needed. Uses the basename of cmd[0] so full paths work.
#
ALLOWED_COMMANDS: set[str] = {
    "theHarvester",
    "theHarvester.py",
    "amass",
    "subfinder",
    "dnsx",
    "httpx",
    "nmap",
    "whois",
    "dig",
    "host",
    "recon-ng",
    "shodan",
    "maltego",
    "spiderfoot",
    "eyewitness",
    "gowitness",
}

# Hard cap on subprocess runtime regardless of what the caller requests
MAX_TIMEOUT_SECONDS = 600

# ── App setup ─────────────────────────────────────────────────────────────────

app = FastAPI(title="TraceNote Proxy", docs_url=None, redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"ok": True, "capabilities": ["fetch", "exec"]}

# ── HTTP relay ────────────────────────────────────────────────────────────────

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

# ── Subprocess runner ─────────────────────────────────────────────────────────

@app.post("/exec")
async def proxy_exec(req: Request):
    """
    Run an allowlisted CLI tool and return its stdout/stderr.

    Request body:
        {
            "cmd":     ["theHarvester", "-d", "example.com", "-b", "all"],
            "timeout": 120,   // seconds, optional, capped at MAX_TIMEOUT_SECONDS
            "cwd":     "/path/to/working/dir"   // optional
        }

    Response:
        {
            "stdout":     "...",
            "stderr":     "...",
            "returncode": 0
        }

    Errors (4xx/5xx):
        { "error": "..." }
    """
    body    = await req.json()
    cmd     = body.get("cmd", [])
    timeout = min(int(body.get("timeout", 60)), MAX_TIMEOUT_SECONDS)
    cwd     = body.get("cwd") or None

    if not cmd or not isinstance(cmd, list):
        return JSONResponse({"error": "cmd must be a non-empty list"}, status_code=400)

    # Security: extract basename to prevent path traversal tricks
    executable = Path(str(cmd[0])).name
    if executable not in ALLOWED_COMMANDS:
        return JSONResponse(
            {
                "error": (
                    f"'{executable}' is not in ALLOWED_COMMANDS. "
                    "Edit proxy.py to add it to the allowlist."
                )
            },
            status_code=403,
        )

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=cwd,
        )
        return {
            "stdout":     result.stdout,
            "stderr":     result.stderr,
            "returncode": result.returncode,
        }
    except subprocess.TimeoutExpired:
        return JSONResponse(
            {"error": f"Command timed out after {timeout}s"},
            status_code=504,
        )
    except FileNotFoundError:
        return JSONResponse(
            {"error": f"Executable not found: {cmd[0]}. Is it installed and on PATH?"},
            status_code=404,
        )
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
