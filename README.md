# TraceNote

> **AI Declaration**: This project is a vibe coding experiment. The architecture, specification, and code are being generated with AI assistance (Claude, Anthropic). It is exploratory by nature -- expect rough edges, evolving structure, and the occasional questionable decision made at speed.

---

A privacy-first OSINT investigation board. Build a graph of entities, relationships, and evidence. Everything lives in a single `.tnote` file on your disk. No server. No cloud. No telemetry.

The core idea: you pick a target, you start pulling threads, and TraceNote gives you a spatial canvas to lay it all out -- people, locations, organisations, documents, images, connections between them. As the picture grows, so does the graph.

![TraceNote screenshot](docs/screenshot.png)

---

## Features

- **Graph-based case board** -- freeform canvas with nodes and edges, built on React Flow
- **`.tnote` file format** -- a single zip archive containing your graph, canvas layout, rich content, and all attachments
- **Rich node content** -- every node can have a full BlockNote document (headings, lists, tables, images, code blocks)
- **Freeform + auto layout** -- drag nodes freely, or apply dagre/force-directed auto layout
- **Optional edge labels** -- connect nodes with or without a relationship label
- **Tag library** -- tag nodes and filter the canvas by tag
- **Full-text search** -- search across labels, summaries, tags, and properties
- **Offline first** -- runs entirely in the browser, no network requests at runtime
- **File System Access API** -- open and save `.tnote` files directly to disk, draw.io style

---

## Getting Started

### Prerequisites

- Node.js 18+
- PNPM

```bash
npm install -g pnpm
```

### Install

```bash
git clone https://github.com/yourname/tracenote.git
cd tracenote
pnpm install
```

### Run

```bash
pnpm dev
```

Opens at `http://localhost:5173`.

### Build

```bash
pnpm build
```

Output goes to `dist/`. The build is a fully static bundle -- it can be served from any static host, a local file server, or even a USB stick.

### Preview the build

```bash
pnpm preview
```

---

## The `.tnote` Format

A `.tnote` file is a ZIP archive. You own the file. It lives wherever you put it.

```
case.tnote
├── manifest.json       # case title, version, timestamps
├── graph.json          # all nodes and edges
├── canvas.json         # node positions and viewport state
├── assets/             # images, PDFs, and other attachments
└── content/            # BlockNote documents, one per node
```

You can open a `.tnote` with any zip tool if you need to inspect or recover its contents.

---

## Browser Support

TraceNote uses the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) for direct file access. This is supported in Chromium-based browsers (Chrome, Edge, Brave, Arc).

Firefox and Safari users get a fallback: open via file picker, save via download. It works, but it's less seamless.

---

## Privacy

- No analytics
- No error reporting
- No network requests at runtime
- Case data never touches `localStorage` or any browser storage -- it lives in the `.tnote` file only

If you are tracking sensitive targets, keep your `.tnote` files on encrypted storage. File-level encryption is on the roadmap for a future release.

---

## Roadmap

- [ ] File encryption (passphrase-based, AES-GCM via Web Crypto)
- [ ] Timeline / chronological view
- [ ] Node clustering and grouping
- [ ] Custom node types with field templates
- [ ] Export to PDF / PNG

---

## Stack

- [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- [React Flow](https://reactflow.dev/) -- canvas and graph rendering
- [BlockNote](https://www.blocknotejs.org/) -- rich text editing
- [Zustand](https://zustand-demo.pmnd.rs/) -- state management
- [JSZip](https://stuk.github.io/jszip/) -- `.tnote` archive handling
- [Dagre](https://github.com/dagrejs/dagre) -- hierarchical auto layout
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Lucide](https://lucide.dev/) -- icons

---

## Licence

MIT