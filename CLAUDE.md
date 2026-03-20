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