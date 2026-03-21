# CLAUDE.md — TraceNote OSINT Case Board

## Project Overview

TraceNote is a privacy-first, offline-capable OSINT investigation tool. It presents as a spatial case board where the investigator builds a graph of entities, relationships, and evidence about one or more targets. Everything lives in a single `.tnote` file on the user's disk. There is no server, no telemetry, no cloud sync unless the user explicitly chooses it later.

The core metaphor is a detective's evidence board: nodes are entities or artefacts, edges are relationships between them, and the canvas is the investigator's working space.

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | React 18 + Vite |
| Language | TypeScript (strict) |
| Styling | Tailwind v4+ (`@import "tailwindcss"`, no config file) |
| Canvas / Graph rendering | React Flow (`@xyflow/react`) |
| Rich text editor | BlockNote (`@blocknote/react`, `@blocknote/core`) |
| File archive | JSZip |
| File system access | File System Access API (with fallback to `<input type="file">` download) |
| State management | Zustand |
| Graph algorithms | Custom (adjacency list in memory, no external graph DB) |
| Auto layout | Dagre (`dagre`) for hierarchical, d3-force (`d3-force`) for force-directed |
| Unique IDs | `nanoid` |
| Package manager | PNPM |

No SSR. No Next.js. No server-side anything.

---

## File Format: `.tnote`

A `.tnote` file is a ZIP archive. It contains:

```
case.tnote (ZIP)
├── manifest.json         # schema version, case title, created/modified timestamps
├── graph.json            # all nodes and edges
├── canvas.json           # node positions, viewport state, layout preferences
├── assets/
│   └── <asset-id>.<ext>  # images, PDFs, and other binary attachments
└── content/
    └── <node-id>.json    # BlockNote document JSON for nodes that have rich content
```

### `manifest.json`

```json
{
  "version": 1,
  "title": "Operation: Redfield",
  "created": "2026-03-20T21:00:00Z",
  "modified": "2026-03-20T21:47:18Z"
}
```

### `graph.json`

```json
{
  "nodes": [
    {
      "id": "abc123",
      "label": "John Doe",
      "summary": "Primary suspect",
      "tags": ["suspect", "witness"],
      "thumbnail": "abc123.jpg",
      "hasContent": true,
      "createdAt": "2026-03-20T21:00:00Z",
      "updatedAt": "2026-03-20T21:47:00Z",
      "properties": {
        "dob": "1985-04-12",
        "nationality": "British"
      }
    }
  ],
  "edges": [
    {
      "id": "edge001",
      "source": "abc123",
      "target": "def456",
      "label": "photographed at",
      "notes": "CCTV image, 14 March 2026",
      "createdAt": "2026-03-20T21:10:00Z"
    }
  ]
}
```

Key points:
- Node `properties` is a freeform key-value map. No schema enforcement.
- Edge `label` is optional. Edges can exist with no label and no notes.
- `hasContent` signals whether a corresponding `content/<node-id>.json` BlockNote doc exists.
- `thumbnail` is optional; references a filename in `assets/`.

### `canvas.json`

```json
{
  "positions": {
    "abc123": { "x": 320, "y": 180 },
    "def456": { "x": 700, "y": 400 }
  },
  "viewport": { "x": 0, "y": 0, "zoom": 1 },
  "layout": "freeform"
}
```

---

## Application Architecture

```
src/
├── main.tsx
├── App.tsx
├── store/
│   ├── graphStore.ts        # Zustand: nodes, edges, CRUD operations
│   ├── canvasStore.ts       # Zustand: positions, viewport, layout mode
│   └── fileStore.ts         # Zustand: file handle, dirty state, save status
├── file/
│   ├── tnoteReader.ts       # unzip and parse a .tnote into app state
│   ├── tnoteWriter.ts       # serialise app state into a .tnote zip
│   └── fileHandle.ts        # File System Access API wrapper with fallback
├── graph/
│   ├── types.ts             # Node, Edge, GraphState TypeScript types
│   ├── graphOps.ts          # add/update/delete node/edge, traversal helpers
│   └── layout/
│       ├── dagre.ts         # dagre auto-layout
│       └── force.ts         # d3-force auto-layout
├── components/
│   ├── canvas/
│   │   ├── CaseBoard.tsx    # React Flow wrapper, main canvas
│   │   ├── NodeCard.tsx     # custom React Flow node component
│   │   └── EdgeLine.tsx     # custom React Flow edge component
│   ├── panels/
│   │   ├── NodePanel.tsx    # right-hand panel: node properties, content editor
│   │   ├── SearchPanel.tsx  # full-text search across nodes
│   │   └── SidebarPanel.tsx # left sidebar: case info, stats, tag library
│   ├── dialogs/
│   │   ├── NewNodeDialog.tsx
│   │   ├── EdgeDialog.tsx   # create/edit edge label and notes
│   │   └── OpenOrCreateDialog.tsx  # shown on startup
│   ├── editor/
│   │   └── ContentEditor.tsx  # BlockNote editor wrapper
│   └── ui/                  # shared primitives (Button, Input, Badge, etc.)
├── hooks/
│   ├── useAutoSave.ts       # debounced save on state change
│   ├── useSearch.ts         # searches node labels, summaries, tags, content
│   └── useLayout.ts         # triggers auto-layout and merges positions
└── types/
    └── index.ts
```

---

## Core Features

### 1. Open / Create on Launch

On startup, show a blocking modal:
- **Open existing** — triggers File System Access API `showOpenFilePicker` filtered to `.tnote`
- **Create new** — prompts for a case title, then `showSaveFilePicker` to choose location
- No board is shown until a file is open

After opening, the file handle is kept in `fileStore`. The app writes back to the same file handle on every save. The user never has to think about where the file is.

If the File System Access API is unavailable (Firefox, iOS), fall back to:
- Open: `<input type="file">` to read the zip
- Save: trigger a download of the zip with the original filename

### 2. Auto-Save

Debounced write to the file handle triggered on any state change (node add/edit/delete, edge add/edit/delete, position change). Debounce delay: 1500ms. Show a save indicator in the toolbar (saving / saved / error).

The write process:
1. Serialise `graphStore` to `graph.json`
2. Serialise `canvasStore` to `canvas.json`
3. Open the existing zip, merge in new content blobs, write back
4. Assets and content blobs are only re-written if they changed (track dirty flags per node)

### 3. The Canvas

Built on React Flow. Key behaviours:
- Freeform drag by default
- Nodes snap to a subtle grid (configurable)
- Double-click on empty canvas creates a new node at that position
- Double-click on a node opens the node panel
- Right-click on a node opens a context menu (edit, delete, connect, view content)
- Click and drag between node connection handles to create an edge
- Clicking an edge opens the edge dialog for label/notes
- Minimap in the bottom-right corner
- Toolbar buttons to trigger auto-layout (dagre or force), reset viewport, toggle grid

### 4. Nodes

Each node renders as a card on the canvas with:
- Thumbnail image (if set) in a top section
- Label (bold, prominent)
- Summary (short subtext)
- Tag badges

Node panel (right side, opens on select):
- Edit label, summary
- Freeform properties editor (key-value pairs, add/remove rows)
- Tag picker (type to add, select from library)
- Thumbnail upload (drag-drop or file picker)
- Attachment list (other files attached to this node: PDFs, screenshots, etc.)
- Open full content editor button (opens BlockNote in a modal or expanded panel)

### 5. Rich Content (BlockNote)

Each node can optionally have a BlockNote document. This supports:
- Headings, paragraphs, lists, tables
- Inline images (stored as assets in the `.tnote`)
- Code blocks
- Embeds and custom blocks as needed

Content is stored as BlockNote's native JSON format in `content/<node-id>.json` inside the archive. On open, content is loaded lazily (only when the node panel is opened). Do not load all content blobs into memory at startup.

### 6. Edges

Edges are created by dragging from one node's handle to another in React Flow. On release:
- If source and target are distinct, create the edge immediately
- Show the edge dialog to optionally add a label and/or notes
- User can dismiss the dialog without adding a label; the edge still exists

Edge appearance:
- Default: dashed line
- With a label: solid line, label shown inline on the edge
- Hovering an edge shows a small edit button

### 7. Search

Global search accessible via keyboard shortcut (`/` or `Cmd+K`):
- Searches node labels, summaries, tags, and freeform properties
- Does not search BlockNote content on every keystroke (too expensive); offer a separate "search content" toggle that does a full scan
- Results show as a floating panel, clicking a result pans the canvas to that node and selects it

### 8. Auto-Layout

Two layout options available from the toolbar:
- **Dagre** — hierarchical, good for org-chart-style relationship trees
- **Force-directed** — good for dense interconnected graphs

Applying a layout:
1. Compute new positions using the chosen algorithm
2. Animate nodes to their new positions (React Flow's built-in transition)
3. Allow individual nodes to be pinned (exempt from auto-layout)
4. Save new positions back to `canvasStore` and trigger auto-save

### 9. Tags

Tags are freeform strings. A tag library is maintained globally (union of all tags in use). The sidebar shows the tag library with click-to-filter: clicking a tag highlights all nodes that have it on the canvas, dims others.

### 10. Offline / Privacy

- Zero network requests at runtime
- No analytics, no telemetry, no error reporting to any external service
- No localStorage or sessionStorage used for case data (everything in the `.tnote` file)
- The app can be served as a static bundle from a USB stick or local file server

---

## Design Direction

Dark theme only. The aesthetic is a serious operational tool, not a consumer app. Think:
- Deep dark backgrounds (`#0d1117` range)
- Tight, monospaced or semi-condensed type for data fields
- Accent colour: a single high-contrast colour (e.g. amber or electric blue) used sparingly for active states, connections, and highlights
- Node cards should feel like physical index cards: slightly lighter background than the canvas, subtle border
- Connections (edges) should look intentional: clean dashed lines at rest, solid when labelled
- No gradients on UI chrome. Gradients are reserved for node thumbnails and image treatments only
- Iconography: minimal, line-based (Lucide)

Reference images provided: TraceNote prototype (Images 1-4) and the Chinatown Detective OS evidence board (Image 5). The target aesthetic is closer to Image 5: noir, purposeful, slightly cinematic, but kept legible and functional.

---

## TypeScript Types (Core)

```typescript
export type NodeId = string;
export type EdgeId = string;
export type AssetId = string;

export interface GraphNode {
  id: NodeId;
  label: string;
  summary?: string;
  tags: string[];
  thumbnail?: AssetId;
  hasContent: boolean;
  properties: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface GraphEdge {
  id: EdgeId;
  source: NodeId;
  target: NodeId;
  label?: string;
  notes?: string;
  createdAt: string;
}

export interface GraphState {
  nodes: Record<NodeId, GraphNode>;
  edges: Record<EdgeId, GraphEdge>;
}

export interface CanvasPosition {
  x: number;
  y: number;
}

export interface CanvasState {
  positions: Record<NodeId, CanvasPosition>;
  viewport: { x: number; y: number; zoom: number };
  layout: 'freeform' | 'dagre' | 'force';
  pinnedNodes: Set<NodeId>;
}

export interface CaseManifest {
  version: number;
  title: string;
  created: string;
  modified: string;
}

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export interface FileState {
  handle: FileSystemFileHandle | null;
  filename: string;
  saveStatus: SaveStatus;
  lastSaved: string | null;
}
```

---

## Key Implementation Notes

- React Flow requires nodes to have `id`, `position`, `data`, and `type` fields. Keep the React Flow node shape as a derived/mapped form of `GraphNode` -- do not conflate the two. Map from `GraphState` + `CanvasState` to React Flow props in a selector.
- BlockNote documents must not be loaded into Zustand. Load them on demand from the zip and cache them locally in component state. Write them back to the zip independently of the main graph save.
- JSZip's `loadAsync` and `generateAsync` are async. All file operations must be properly awaited. Wrap in try/catch and surface errors to the user via the save status indicator.
- The File System Access API `write` method requires the file handle to have write permission. Check `queryPermission` on startup when reopening a recent file, and call `requestPermission` if needed.
- Asset ingestion: when the user drops an image onto a node or attaches a file, read it as an `ArrayBuffer`, generate a nanoid for the asset, store it in a map in memory, and flush it to `assets/` in the zip on the next save. Never hold binary data in Zustand -- keep a separate `Map<AssetId, ArrayBuffer>` outside the store.
- Dagre layout: use `dagre.graphlib.Graph`, set node sizes based on card dimensions (approx 200x120), run `dagre.layout()`, then read back `node.x` and `node.y`.

---

## Out of Scope (v1)

- Multi-user collaboration
- Cloud sync
- Timeline / chronological view (good v2 feature)
- Link analysis (automatic OSINT enrichment, e.g. calling APIs) -- the app is deliberately passive
- Mobile / touch support
- Encryption of the `.tnote` file (noted as a strong v2 requirement given the sensitivity of OSINT data)

---

## Development Notes for Claude

When implementing this project:

1. Start with the file open/create flow and the `.tnote` read/write cycle. Nothing else matters until that works.
2. Get a basic React Flow canvas rendering nodes from `graphStore` before adding any panels or editors.
3. Add BlockNote last. It has the most complex integration and should not block the core graph functionality.
4. Keep `graph.json` as the source of truth. Canvas positions are secondary state.
5. Do not use `localStorage` for anything except ephemeral UI state (e.g. last panel width). Case data lives in the file only.
6. All user-facing text should treat the file as the session. There is no "project" concept separate from the file.
---

## Feature: OSINT Provider Manager

### Overview

Add an OSINT provider management system. Analysts define external data sources (APIs, CLI tools, browser scrapers) and run them against seed values from the case board. Results come back as staged node/edge candidates which the analyst reviews before they touch the graph. This keeps the graph clean and maintains a clear evidence chain.

No server dependencies. No new runtime npm packages unless absolutely necessary. Everything persists in `localStorage` under a dedicated key, separate from case data.

---

### New Files to Create

```
src/
├── providers/
│   ├── types.ts              # All provider-related TypeScript types
│   ├── providerStore.ts      # Zustand store for providers, staged results, log
│   └── providerTemplates.ts  # Built-in template definitions (Shodan, crt.sh, etc.)
├── components/
│   └── providers/
│       ├── ProviderPanel.tsx       # Main tabbed panel: list / detail / log
│       ├── ProviderList.tsx        # Left column: provider list with status dots
│       ├── ProviderDetail.tsx      # Centre: edit form for a selected provider
│       ├── ProviderLog.tsx         # Right column or tab: activity log + stats
│       ├── AddProviderModal.tsx    # Modal for adding a new provider from template or scratch
│       └── StagingQueue.tsx        # Review panel for staged results before graph commit
```

---

### Types (`src/providers/types.ts`)

```typescript
import type { NodeType } from '../types';

export type SeedType =
  | 'domain' | 'ip' | 'email' | 'username'
  | 'person' | 'org' | 'phone' | 'hash' | 'url' | 'keyword';

export type ExecMode = 'api' | 'subprocess' | 'browser' | 'local';

export type ProviderCategory =
  | 'network' | 'domain' | 'person' | 'email'
  | 'social' | 'geo' | 'darkweb' | 'custom';

export type LogLevel = 'success' | 'error' | 'warn' | 'info';

export interface ProviderStats {
  requests: number;
  errors:   number;
  nodes:    number;
  edges:    number;
  lastRun:  number | null;  // unix ms
}

export interface OsintProvider {
  id:               string;
  templateId:       string | null;
  name:             string;
  category:         ProviderCategory;
  exec:             ExecMode;
  seeds:            SeedType[];       // which seed types this provider accepts
  endpoint:         string;           // API base URL or CLI command
  apiKey:           string;           // stored locally, stripped on export
  rateLimit:        number | null;    // req/min, null = unlimited
  notes:            string;
  enabled:          boolean;
  confirmBeforeRun: boolean;
  stageResults:     boolean;          // hold results for review before adding to graph
  stats:            ProviderStats;
  createdAt:        number;
}

export interface StagedNode {
  label:      string;
  nodeType:   NodeType;
  summary?:   string;
  properties: Record<string, string>;
  tags:       string[];
  confidence: 'low' | 'medium' | 'high';
}

export interface StagedEdge {
  sourceLabel: string;
  targetLabel: string;
  edgeLabel?:  string;
}

export interface StagedResult {
  id:           string;
  providerId:   string;
  providerName: string;
  seedValue:    string;
  seedType:     SeedType;
  nodes:        StagedNode[];
  edges:        StagedEdge[];
  createdAt:    number;
  approved:     boolean;
  dismissed:    boolean;
}

export interface ProviderLogEntry {
  id:           string;
  providerId:   string;
  providerName: string;
  level:        LogLevel;
  message:      string;
  meta: {
    nodes?:    number;
    edges?:    number;
    duration?: number;
    seed?:     string;
  };
  ts: number;
}
```

---

### Zustand Store (`src/providers/providerStore.ts`)

Persist to `localStorage` under key `tracenote_providers_v1`. Keep the log under a separate key `tracenote_provider_log_v1` and cap it at 500 entries.

The store must expose:

```typescript
interface ProviderStoreState {
  providers:     OsintProvider[];
  log:           ProviderLogEntry[];
  staged:        StagedResult[];

  // Provider CRUD
  addProvider:    (p: Omit<OsintProvider, 'id' | 'createdAt' | 'stats'>) => OsintProvider;
  updateProvider: (id: string, updates: Partial<OsintProvider>) => void;
  deleteProvider: (id: string) => void;

  // Logging — bumps provider.stats.requests automatically
  addLogEntry: (
    providerId: string,
    providerName: string,
    level: LogLevel,
    message: string,
    meta?: ProviderLogEntry['meta']
  ) => void;
  clearLog: () => void;

  // Staging
  addStagedResult: (result: Omit<StagedResult, 'id' | 'createdAt' | 'approved' | 'dismissed'>) => void;
  approveStaged:   (id: string) => void;   // marks approved; caller commits to graphStore
  dismissStaged:   (id: string) => void;
  clearStaged:     () => void;

  // Export: providers without apiKey fields
  exportConfig: () => OsintProvider[];
}
```

Use `nanoid` for IDs (already a dependency).

When `addLogEntry` is called:
- Push to `log`, trim to last 500
- Find the matching provider and increment `stats.requests`; if `level === 'error'` also increment `stats.errors`
- If `meta.nodes` is provided, add to `stats.nodes`
- If `meta.edges` is provided, add to `stats.edges`
- Set `stats.lastRun` to `Date.now()`
- Persist both providers and log to localStorage

---

### Built-in Templates (`src/providers/providerTemplates.ts`)

Define `PROVIDER_TEMPLATES` as a typed array. Include at minimum:

| id            | name            | category | exec       | seeds                              | endpoint                            |
|---------------|-----------------|----------|------------|------------------------------------|-------------------------------------|
| theHarvester  | theHarvester    | domain   | subprocess | domain, org                        | theHarvester                        |
| shodan        | Shodan          | network  | api        | ip, domain                         | https://api.shodan.io               |
| whois         | WHOIS           | domain   | api        | domain                             | https://who-dat.as93.net            |
| crtsh         | crt.sh          | domain   | api        | domain                             | https://crt.sh                      |
| hibp          | HaveIBeenPwned  | email    | api        | email                              | https://haveibeenpwned.com/api/v3   |
| virustotal    | VirusTotal      | network  | api        | ip, domain, hash, url              | https://www.virustotal.com/api/v3   |
| spiderfoot    | SpiderFoot      | domain   | api        | domain, ip, email, username        | http://localhost:5001               |
| custom        | Custom          | custom   | api        | (empty)                            | (empty)                             |

Each template also has a short `desc` string for display in the add modal.

---

### UI — ProviderPanel

Opened via a toolbar button in `App.tsx` (add a `Radar` icon from lucide-react). Renders as a right-side drawer or full overlay — match whatever pattern is used for the existing `NodePanel` / `SearchPanel`.

The panel has three sections, either as tabs or a three-column layout:

**Column 1 — Provider list**
- One row per provider
- Status dot: green (enabled), grey (disabled), red (last run was an error)
- Provider name + category badge
- Clicking a row selects it and shows its detail in column 2

**Column 2 — Provider detail / edit form**
- When nothing selected, show empty state
- When a provider is selected, show an editable form:
  - Name (text input)
  - Category (select)
  - Execution mode (select)
  - Seed types (multi-toggle: click to toggle each `SeedType`)
  - Endpoint (text input)
  - API Key (text input — label it "Stored locally only")
  - Rate limit (number input, req/min)
  - Notes (textarea)
  - Toggles for: Enabled, Confirm Before Run, Stage Results
  - Stats block: requests, errors, nodes out, last run timestamp
- Save button writes back via `updateProvider`
- Remove button calls `deleteProvider` with a confirmation

**Column 3 — Activity log**
- Three stat boxes at top: total requests, errors, nodes created
- Filter buttons: All / Success / Error / Warn
- Log entries in reverse-chronological order, each showing:
  - Coloured dot by level
  - Provider name
  - Message
  - Any meta (nodes/edges/duration) shown as muted inline text
  - Timestamp (HH:MM:SS)
- Clear button

---

### Add Provider Modal (`AddProviderModal.tsx`)

Triggered by "Add Provider" button in the panel header.

Flow:
1. Step 1 — pick a template (grid of template cards, each showing name + desc). Selecting a template pre-fills the form fields.
2. Step 2 — fill in / confirm details (same fields as the detail form). API key, endpoint, and rate limit are the main things to fill in for real providers.
3. Save calls `addProvider` and closes the modal.

---

### Staging Queue (`StagingQueue.tsx`)

A separate view (tab or secondary panel) that shows pending `StagedResult` entries where `approved === false && dismissed === false`.

For each staged result:
- Header: provider name, seed value, seed type, timestamp
- Node candidates: list of `StagedNode` with label, nodeType badge, confidence badge, key properties
- Edge candidates: list of `StagedEdge` shown as `source → target`
- Two actions: **Approve** (calls `approveStaged` then commits via `useGraphStore.addNode/addEdge`) and **Dismiss**

When approving a `StagedResult`:
- For each `StagedNode`, call `graphStore.addNode(...)` with the staged data mapped to `GraphNode` shape
- For each `StagedEdge`, resolve `sourceLabel` and `targetLabel` against the newly created and existing nodes by label, then call `graphStore.addEdge(...)`
- Log a `success` entry via `addLogEntry` with `meta.nodes` and `meta.edges` counts

Edge case: if `stageResults` is false on the provider, skip the staging queue and commit directly.

---

### Wiring into App.tsx

1. Add a `Radar` (or `ScanLine`) icon button to the toolbar alongside the existing Search button
2. Add `showProviders` boolean state
3. Conditionally render `<ProviderPanel>` when `showProviders` is true, using the same panel pattern as the existing right-hand panels
4. No changes to the `.tnote` file format — provider config is not part of the case file, it lives in localStorage

---

### Design Constraints

Follow the existing design language precisely:
- Background colours: `#0d1117`, `#161b22`, `#1c2333`
- Border: `#30363d`
- Muted text: `#484f58`, `#8b949e`
- Primary text: `#e6edf3`
- Accent: amber (`text-amber-400`, `bg-amber-400/10`) for active states, matching the existing pin handles and case badge
- Success/active: `#3fb950` (matches existing save indicator)
- Error: `text-red-400`
- Font sizes and spacing should match `SidebarPanel.tsx` and `NodePanel.tsx` — look at those before writing any new CSS
- Use Tailwind utility classes. No new CSS files.
- Icons from `lucide-react` only

---

### What Not to Do

- Do not add any npm packages beyond what is already in `package.json`
- Do not write to the `.tnote` file or touch `tnoteReader.ts` / `tnoteWriter.ts`
- Do not put provider config or log data into any Zustand store that gets serialised to the case file
- Do not make any network requests — the provider system defines providers but does not execute them; execution is out of scope for this implementation
- Do not use `localStorage` for anything except the two provider keys (`tracenote_providers_v1`, `tracenote_provider_log_v1`)
---

## Feature: Global Proxy & Proxied Request Layer

### Overview

Most OSINT APIs block direct browser requests via CORS. The fix is a user-configured proxy URL stored in the `.tnote` file itself -- it travels with the case, not the browser. The analyst points it at their own local relay (e.g. a small Python script on `localhost:8765`). All provider HTTP calls route through it transparently when one is set.

The proxy URL lives in `settings.json` inside the zip, read and written as part of the normal file open/save cycle.

---

### `.tnote` File Format Update

Add `settings.json` as a new optional entry in the zip archive:

```
case.tnote (ZIP)
├── manifest.json
├── graph.json
├── canvas.json
├── settings.json         ← new
├── assets/
└── content/
```

`settings.json` shape:

```json
{
  "proxyUrl": "http://localhost:8765"
}
```

`proxyUrl` is the only field for now. Empty string or absent means no proxy. The file is optional -- if missing, defaults apply.

---

### Type Changes (`src/types/index.ts`)

Add a `CaseSettings` interface:

```typescript
export interface CaseSettings {
  proxyUrl: string;
}

export const DEFAULT_CASE_SETTINGS: CaseSettings = {
  proxyUrl: '',
};
```

---

### Reader (`src/file/tnoteReader.ts`)

Add `settings` to the `TnoteData` return type:

```typescript
export interface TnoteData {
  // ...existing fields...
  settings: CaseSettings;
}
```

In `readTnote`, parse `settings.json` if present:

```typescript
const settingsRaw = await zip.file('settings.json')?.async('string');
const settings: CaseSettings = settingsRaw
  ? { ...DEFAULT_CASE_SETTINGS, ...JSON.parse(settingsRaw) }
  : { ...DEFAULT_CASE_SETTINGS };
```

Return `settings` in the result object.

---

### Writer (`src/file/tnoteWriter.ts`)

Add `settings: CaseSettings` to `WriteOptions` and write it to the zip:

```typescript
zip.file('settings.json', JSON.stringify(opts.settings, null, 2));
```

---

### Settings Store (`src/store/settingsStore.ts`)

New Zustand store. No localStorage -- state is loaded from the file on open and flushed to the file on save via the normal auto-save cycle.

```typescript
import { create } from 'zustand';
import type { CaseSettings } from '../types';

interface SettingsStoreState extends CaseSettings {
  proxyStatus: 'unchecked' | 'ok' | 'unreachable';
  setProxyUrl:    (url: string) => void;
  setProxyStatus: (status: SettingsStoreState['proxyStatus']) => void;
  load:           (settings: CaseSettings) => void;
  reset:          () => void;
}

export const useSettingsStore = create<SettingsStoreState>((set) => ({
  proxyUrl:    '',
  proxyStatus: 'unchecked',
  setProxyUrl:    (url) => set({ proxyUrl: url.replace(/\/$/, ''), proxyStatus: 'unchecked' }),
  setProxyStatus: (proxyStatus) => set({ proxyStatus }),
  load:           (settings) => set({ ...settings, proxyStatus: 'unchecked' }),
  reset:          () => set({ proxyUrl: '', proxyStatus: 'unchecked' }),
}));
```

---

### Wiring into App.tsx

When a file is opened and `readTnote` returns, call:
```typescript
useSettingsStore.getState().load(data.settings);
```

When `writeTnote` is called, pass:
```typescript
settings: useSettingsStore.getState()
```
(spread or pick just `{ proxyUrl }` -- `proxyStatus` is runtime-only and must not be written to the file).

When the file store resets (case closed), call:
```typescript
useSettingsStore.getState().reset();
```

---

### Updated Fetch Layer (`src/providers/providerRunners.ts`)

Replace the existing `apiFetch` with one that checks `settingsStore`:

```typescript
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
```

No other changes to `providerRunners.ts`. All existing runners call `apiFetch` and get proxy routing automatically.

---

### Settings UI

Add a **Settings** tab to `ProviderPanel.tsx` alongside Providers / Staging / Log.

The Settings tab contains one section: **Proxy**.

- **Proxy URL** text input, placeholder `http://localhost:8765`
  - On change: call `setProxyUrl` and trigger a debounced health check (600ms)
  - On mount: if `proxyUrl` is non-empty, run the health check immediately
- **Status indicator** inline next to the input:
  - Grey dot + "Not configured" when `proxyUrl` is empty
  - Amber dot + "Checking…" while in-flight
  - Green dot + "Connected" on success
  - Red dot + "Unreachable" on failure
- **Test** button to manually re-run the health check

Health check: `GET {proxyUrl}/health` expecting `{ ok: true }`. Any network error or non-`ok` response sets status to `'unreachable'`.

Below the input, a collapsible **Setup** block (collapsed by default):

```
Run the included proxy before using CORS-restricted providers (Shodan, HIBP, VirusTotal).

  pip install fastapi uvicorn httpx
  python proxy/proxy.py

Requests are forwarded to the target API and returned to TraceNote.
Nothing is stored or logged. Source: proxy/proxy.py
```

Note: changing the proxy URL here triggers auto-save (it is part of the case file now), just like any other state change. No separate save button needed -- the existing debounced auto-save handles it.

---

### Proxy Status in ProviderDetail

In `ProviderDetail.tsx`, add a small inline notice below the Endpoint field for `exec === 'api'` providers that are not known CORS-safe (`crtsh`, `whois`):

- `proxyUrl` empty → amber warning: "This provider may be CORS-blocked. Configure a proxy in Settings."
- `proxyStatus === 'ok'` → green: "Requests will route through your local proxy."
- `proxyStatus === 'unreachable'` → red: "Proxy configured but unreachable."

Read from `useSettingsStore`. No new components needed.

---

### `proxy/proxy.py` (reference implementation)

Create at `proxy/proxy.py` in the project root:

```python
"""
TraceNote local CORS proxy.

Forwards HTTP requests from the TraceNote browser app to OSINT APIs
that block direct browser requests via CORS.

Usage:
    pip install fastapi uvicorn httpx
    uvicorn proxy:app --port 8765

No data is stored or logged.
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
```

---

### What Not to Do

- Do not use `localStorage` for the proxy URL or any other case setting.
- Do not add a per-provider proxy toggle. The proxy is global.
- Do not write `proxyStatus` to `settings.json` -- it is runtime state only.
- Do not change how individual runners work. All proxy logic lives in `apiFetch` only.
- Do not log the full request URL to the activity log.