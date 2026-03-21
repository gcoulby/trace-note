"""
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
