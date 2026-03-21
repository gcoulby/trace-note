import { useState, useCallback, useEffect } from 'react';
import { useGraphStore } from './store/graphStore';
import { useCanvasStore } from './store/canvasStore';
import { useFileStore } from './store/fileStore';
import {
  openTnoteFile,
  createTnoteFile,
  writeTnoteFile,
  downloadBlob,
  saveHandleToIDB,
  getHandleFromIDB,
} from './file/fileHandle';
import { readTnote } from './file/tnoteReader';
import { writeTnote } from './file/tnoteWriter';
import { isEncryptedBuffer, decryptBlob, encryptBlob } from './lib/crypto';
import { OpenOrCreateDialog } from './components/dialogs/OpenOrCreateDialog';
import { PasswordDialog } from './components/dialogs/PasswordDialog';
import { NewNodeDialog } from './components/dialogs/NewNodeDialog';
import { EdgeDialog } from './components/dialogs/EdgeDialog';
import { InfoPanel } from './components/dialogs/InfoPanel';
import { FileExplorer } from './components/dialogs/FileExplorer';
import { ContentEditor } from './components/editor/ContentEditor';
import { CaseBoard } from './components/canvas/CaseBoard';
import { ContextMenu, type ContextMenuItem } from './components/canvas/ContextMenu';
import { NodePanel } from './components/panels/NodePanel';
import { SidebarPanel } from './components/panels/SidebarPanel';
import { SearchPanel } from './components/panels/SearchPanel';
import { useAutoSave, setCurrentFileBlob, assetMap } from './hooks/useAutoSave';
import { useLayout } from './hooks/useLayout';
import { cacheAsset } from './lib/assetCache';
import {
  Network,
  GitFork,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Pencil,
  Trash2,
  Plus,
  Maximize2,
  Copy,
  HelpCircle,
  Layers2,
  Archive,
  Lock,
} from 'lucide-react';
import type { CaseManifest, NodeType } from './types';

// ── Save indicator ───────────────────────────────────────────────────────────

function SaveIndicator() {
  const saveStatus  = useFileStore((s) => s.saveStatus);
  const isEncrypted = useFileStore((s) => s.isEncrypted);
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-mono">
      {isEncrypted && (
        <span title="File is encrypted"><Lock size={11} className="text-amber-400/70" /></span>
      )}
      {saveStatus === 'saving' && (
        <><Loader2 size={12} className="animate-spin text-amber-400" /><span className="text-amber-400">saving…</span></>
      )}
      {saveStatus === 'saved' && (
        <><CheckCircle2 size={12} className="text-[#3fb950]" /><span className="text-[#484f58]">saved</span></>
      )}
      {saveStatus === 'unsaved' && (
        <><Clock size={12} className="text-[#8b949e]" /><span className="text-[#484f58]">unsaved</span></>
      )}
      {saveStatus === 'error' && (
        <><AlertCircle size={12} className="text-red-400" /><span className="text-red-400">error</span></>
      )}
    </div>
  );
}

// ── Toolbar ──────────────────────────────────────────────────────────────────

interface ToolbarProps {
  onSearch: () => void;
  onDagre: () => void;
  onForce: () => void;
  onFitView: () => void;
  onInfo: () => void;
  onFiles: () => void;
}

function Toolbar({ onSearch, onDagre, onForce, onFitView, onInfo, onFiles }: ToolbarProps) {
  const manifest = useFileStore((s) => s.manifest);
  return (
    <div className="h-10 bg-[#161b22] border-b border-[#30363d] flex items-center px-4 gap-2 shrink-0">
      <span className="text-[11px] uppercase tracking-wider text-[#484f58] font-mono mr-2">
        {manifest?.title ?? 'TraceNote'}
      </span>
      <div className="h-4 w-px bg-[#30363d]" />
      <button onClick={onDagre} title="Dagre layout"
        className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-[#8b949e] hover:text-amber-400 transition-colors rounded hover:bg-[#1c2333]">
        <GitFork size={12} /> Dagre
      </button>
      <button onClick={onForce} title="Force layout"
        className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-[#8b949e] hover:text-amber-400 transition-colors rounded hover:bg-[#1c2333]">
        <Network size={12} /> Force
      </button>
      <button onClick={onFitView} title="Fit view"
        className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-[#8b949e] hover:text-amber-400 transition-colors rounded hover:bg-[#1c2333]">
        <Maximize2 size={12} /> Fit
      </button>
      <div className="h-4 w-px bg-[#30363d]" />
      <button onClick={onSearch} title="Search  Ctrl+K"
        className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-[#8b949e] hover:text-amber-400 transition-colors rounded hover:bg-[#1c2333]">
        <Search size={12} /> Search
      </button>
      <button onClick={onFiles} title="Browse archive"
        className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-[#8b949e] hover:text-amber-400 transition-colors rounded hover:bg-[#1c2333]">
        <Archive size={12} /> Files
      </button>
      <div className="flex-1" />
      <SaveIndicator />
      <div className="h-4 w-px bg-[#30363d] ml-2" />
      <button onClick={onInfo} title="About TraceNote"
        className="p-1 text-[#8b949e] hover:text-amber-400 transition-colors rounded hover:bg-[#1c2333]">
        <HelpCircle size={14} />
      </button>
    </div>
  );
}

// ── Context menu state ────────────────────────────────────────────────────────

interface CtxMenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

// ── Pending edge ──────────────────────────────────────────────────────────────
// When dragging an edge to empty canvas, we store the origin node so we can
// create the edge after the user names the new node.

let _pendingEdgeSource: string | null = null;

// ── Main app ──────────────────────────────────────────────────────────────────

function AppInner() {
  const { setHandle, setManifest, setSaveStatus, setLastSaved, setEncryption } = useFileStore();
  const { loadGraph, nodes, addNode, deleteNode } = useGraphStore();
  const { loadCanvas, setPosition } = useCanvasStore();

  const [isOpen, setIsOpen] = useState(false);
  const [lastFilename, setLastFilename] = useState<string | null>(null);
  const [lastHandle, setLastHandle] = useState<FileSystemFileHandle | null>(null);

  // Encrypted-file unlock flow
  const [pendingEncBlob, setPendingEncBlob] = useState<Blob | null>(null);
  const [pendingEncHandle, setPendingEncHandle] = useState<FileSystemFileHandle | null>(null);
  const [pendingEncFilename, setPendingEncFilename] = useState<string>('');
  const [passwordError, setPasswordError] = useState('');

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [fitViewTrigger, setFitViewTrigger] = useState(0);
  const [activeEdgeId, setActiveEdgeId] = useState<string | null>(null);
  const [showNewNode, setShowNewNode] = useState<{ x: number; y: number } | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<NodeType | null>(null);
  const [editorNodeId, setEditorNodeId] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);

  const { applyDagre, applyForce } = useLayout();
  useAutoSave();

  const triggerFitView = useCallback(() => setFitViewTrigger((v) => v + 1), []);

  // Check IDB for a previously opened handle on mount
  useEffect(() => {
    getHandleFromIDB().then((handle) => {
      if (handle) { setLastHandle(handle); setLastFilename(handle.name); }
    }).catch(() => {/* ignore */});
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch((v) => !v);
      }
      if (e.key === 'Escape') { setShowSearch(false); setCtxMenu(null); setShowInfo(false); setShowFiles(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── File operations ────────────────────────────────────────────────────────

  const ingestAssets = useCallback((assets: Record<string, { buffer: ArrayBuffer; mimeType: string }>) => {
    Object.entries(assets).forEach(([id, { buffer, mimeType }]) => {
      assetMap.set(id, buffer);
      cacheAsset(id, buffer, mimeType);
    });
  }, []);

  const loadFromBlob = useCallback(async (
    zipBlob: Blob,
    handle: FileSystemFileHandle | null,
    filename: string,
  ) => {
    const data = await readTnote(zipBlob);
    setCurrentFileBlob(zipBlob);
    setHandle(handle, filename);
    setManifest(data.manifest);
    loadGraph(data.nodes, data.edges);
    loadCanvas(data.positions, data.viewport, data.layout);
    ingestAssets(data.assets);
    setSaveStatus('saved');
    setIsOpen(true);
    triggerFitView();
  }, [setHandle, setManifest, loadGraph, loadCanvas, setSaveStatus, ingestAssets, triggerFitView]);

  const loadFromHandle = useCallback(async (handle: FileSystemFileHandle) => {
    const file    = await handle.getFile();
    const buffer  = await file.arrayBuffer();
    if (isEncryptedBuffer(buffer)) {
      setPendingEncBlob(new Blob([buffer]));
      setPendingEncHandle(handle);
      setPendingEncFilename(handle.name);
      setPasswordError('');
      return;
    }
    await loadFromBlob(new Blob([buffer], { type: 'application/zip' }), handle, handle.name);
  }, [loadFromBlob]);

  const handleReopen = useCallback(async () => {
    if (!lastHandle) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const perm = await (lastHandle as any).requestPermission({ mode: 'readwrite' }) as string;
      if (perm !== 'granted') return;
      await loadFromHandle(lastHandle);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') console.error('Reopen failed', err);
    }
  }, [lastHandle, loadFromHandle]);

  const handleOpen = useCallback(async () => {
    try {
      const { handle, file } = await openTnoteFile();
      const buffer = await file.arrayBuffer();
      if (handle) await saveHandleToIDB(handle);
      if (isEncryptedBuffer(buffer)) {
        setPendingEncBlob(new Blob([buffer]));
        setPendingEncHandle(handle);
        setPendingEncFilename(handle?.name ?? file.name);
        setPasswordError('');
        return;
      }
      await loadFromBlob(new Blob([buffer], { type: 'application/zip' }), handle, handle?.name ?? file.name);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') console.error('Open failed', err);
    }
  }, [loadFromBlob]);

  const handleCreate = useCallback(async (title: string, passphrase?: string) => {
    try {
      const { handle, filename } = await createTnoteFile(title);
      const now = new Date().toISOString();
      const manifest: CaseManifest = { version: 1, title, created: now, modified: now };
      setManifest(manifest);
      setHandle(handle, filename);
      loadGraph({}, {});
      loadCanvas({}, { x: 0, y: 0, zoom: 1 }, 'freeform');
      const blob = await writeTnote({ manifest, nodes: {}, edges: {}, positions: {}, viewport: { x: 0, y: 0, zoom: 1 }, layout: 'freeform' });
      setCurrentFileBlob(blob);
      const diskBlob = passphrase ? await encryptBlob(blob, passphrase) : blob;
      if (handle) { await writeTnoteFile(handle, diskBlob); await saveHandleToIDB(handle); }
      else downloadBlob(diskBlob, filename);
      if (passphrase) setEncryption(true, passphrase);
      setSaveStatus('saved');
      setLastSaved(now);
      setIsOpen(true);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') console.error('Create failed', err);
    }
  }, [setHandle, setManifest, loadGraph, loadCanvas, setSaveStatus, setLastSaved, setEncryption]);

  // ── Canvas interactions ────────────────────────────────────────────────────

  const handleNodeDoubleClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  const handleEdgeClick = useCallback((edgeId: string) => {
    setActiveEdgeId(edgeId);
  }, []);

  const handleCanvasDoubleClick = useCallback((x: number, y: number) => {
    setShowNewNode({ x, y });
  }, []);

  const handleNewNode = useCallback((label: string, summary: string) => {
    if (!showNewNode) return;
    const node = addNode({ label, summary, tags: [], hasContent: false, properties: {} });
    setPosition(node.id, showNewNode);
    setShowNewNode(null);
    setSelectedNodeId(node.id);
    triggerFitView();
    // If there's a pending edge source (from drag-to-empty), wire it up
    if (_pendingEdgeSource && _pendingEdgeSource !== node.id) {
      const { addEdge } = useGraphStore.getState();
      addEdge({ source: _pendingEdgeSource, target: node.id });
    }
    _pendingEdgeSource = null;
  }, [showNewNode, addNode, setPosition, triggerFitView]);

  const handleCancelNewNode = useCallback(() => {
    setShowNewNode(null);
    _pendingEdgeSource = null;
  }, []);

  // Edge dragged to empty canvas → create a new node there
  const handleDropCreateNode = useCallback((fromNodeId: string | null, pos: { x: number; y: number }) => {
    _pendingEdgeSource = fromNodeId;
    setShowNewNode(pos);
  }, []);

  // ── Context menus ──────────────────────────────────────────────────────────

  const handleNodeContextMenu = useCallback((nodeId: string, x: number, y: number) => {
    const node = useGraphStore.getState().nodes[nodeId];
    setCtxMenu({
      x, y,
      items: [
        {
          icon: <Pencil size={12} />,
          label: 'Edit',
          onClick: () => setSelectedNodeId(nodeId),
        },
        {
          icon: <Layers2 size={12} />,
          label: 'Duplicate',
          onClick: () => {
            if (!node) return;
            const { positions } = useCanvasStore.getState();
            const pos = positions[nodeId] ?? { x: 100, y: 100 };
            const dup = addNode({
              label: `${node.label} (copy)`,
              summary: node.summary,
              notes: node.notes,
              tags: [...node.tags],
              nodeType: node.nodeType,
              hasContent: false,
              properties: { ...node.properties },
            });
            setPosition(dup.id, { x: pos.x + 40, y: pos.y + 40 });
          },
        },
        {
          icon: <Copy size={12} />,
          label: 'Copy label',
          onClick: () => { if (node) void navigator.clipboard.writeText(node.label); },
        },
        {
          icon: <Trash2 size={12} />,
          label: 'Delete',
          danger: true,
          separator: true,
          onClick: () => {
            deleteNode(nodeId);
            if (selectedNodeId === nodeId) setSelectedNodeId(null);
          },
        },
      ],
    });
  }, [addNode, deleteNode, setPosition, selectedNodeId]);

  const handleCanvasContextMenu = useCallback((x: number, y: number, flowX: number, flowY: number) => {
    setCtxMenu({
      x, y,
      items: [
        {
          icon: <Plus size={12} />,
          label: 'Add node here',
          onClick: () => setShowNewNode({ x: flowX, y: flowY }),
        },
        {
          icon: <Maximize2 size={12} />,
          label: 'Fit view',
          separator: true,
          onClick: triggerFitView,
        },
        {
          icon: <GitFork size={12} />,
          label: 'Dagre layout',
          onClick: applyDagre,
        },
        {
          icon: <Network size={12} />,
          label: 'Force layout',
          onClick: () => void applyForce(),
        },
      ],
    });
  }, [applyDagre, applyForce, triggerFitView]);

  // ── Sidebar ────────────────────────────────────────────────────────────────

  const handleFocusNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setFocusNodeId(nodeId);
  }, []);

  const handleAddNodeFromSidebar = useCallback(() => {
    setShowNewNode({ x: 200 + Math.random() * 400, y: 150 + Math.random() * 200 });
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  // Unlock an encrypted file
  const handleUnlock = async (passphrase: string) => {
    if (!pendingEncBlob) return;
    try {
      const zipBlob = await decryptBlob(pendingEncBlob, passphrase);
      await loadFromBlob(zipBlob, pendingEncHandle, pendingEncFilename);
      setEncryption(true, passphrase);
      if (pendingEncHandle) await saveHandleToIDB(pendingEncHandle);
      setPendingEncBlob(null);
      setPendingEncHandle(null);
    } catch {
      setPasswordError('Wrong passphrase — try again');
    }
  };

  if (pendingEncBlob) {
    return (
      <PasswordDialog
        mode="unlock"
        filename={pendingEncFilename}
        error={passwordError}
        onSubmit={(pw) => void handleUnlock(pw)}
        onCancel={() => { setPendingEncBlob(null); setPendingEncHandle(null); setPasswordError(''); }}
      />
    );
  }

  if (!isOpen) {
    return (
      <OpenOrCreateDialog
        onOpen={() => void handleOpen()}
        onCreate={(title, passphrase) => void handleCreate(title, passphrase)}
        onReopen={lastHandle ? () => void handleReopen() : undefined}
        lastFilename={lastFilename}
      />
    );
  }

  return (
    <div className="h-screen bg-[#0d1117] flex flex-col overflow-hidden">
      <Toolbar
        onSearch={() => setShowSearch((v) => !v)}
        onDagre={applyDagre}
        onForce={() => void applyForce()}
        onFitView={triggerFitView}
        onInfo={() => setShowInfo(true)}
        onFiles={() => setShowFiles(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <SidebarPanel
          activeTag={activeTag}
          onTagClick={setActiveTag}
          activeType={activeType}
          onTypeClick={setActiveType}
          onFocusNode={handleFocusNode}
          onAddNode={handleAddNodeFromSidebar}
          selectedNodeId={selectedNodeId}
        />

        <div className="flex-1 relative overflow-hidden">
          <CaseBoard
            onNodeDoubleClick={handleNodeDoubleClick}
            onNodeContextMenu={handleNodeContextMenu}
            onEdgeClick={handleEdgeClick}
            onCanvasDoubleClick={handleCanvasDoubleClick}
            onCanvasContextMenu={handleCanvasContextMenu}
            onDropCreateNode={handleDropCreateNode}
            activeTag={activeTag}
            activeType={activeType}
            focusNodeId={focusNodeId}
            onFocusConsumed={() => setFocusNodeId(null)}
            fitViewTrigger={fitViewTrigger}
          />

          {Object.keys(nodes).length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-[#484f58] text-sm">Double-click to add a node</div>
                <div className="text-[#3a3f47] text-xs mt-1">Right-click for options · drag the pin to connect</div>
              </div>
            </div>
          )}
        </div>

        {selectedNodeId && (
          <NodePanel
            nodeId={selectedNodeId}
            onClose={() => setSelectedNodeId(null)}
            onOpenEditor={setEditorNodeId}
          />
        )}
      </div>

      {showNewNode && (
        <NewNodeDialog
          onConfirm={handleNewNode}
          onCancel={handleCancelNewNode}
        />
      )}

      {activeEdgeId && (
        <EdgeDialog edgeId={activeEdgeId} onClose={() => setActiveEdgeId(null)} />
      )}

      {showSearch && (
        <SearchPanel
          onSelectNode={(id) => { setSelectedNodeId(id); setFocusNodeId(id); }}
          onClose={() => setShowSearch(false)}
        />
      )}

      {ctxMenu && (
        <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={() => setCtxMenu(null)} />
      )}

      {showInfo && <InfoPanel onClose={() => setShowInfo(false)} />}

      {showFiles && (
        <FileExplorer
          onClose={() => setShowFiles(false)}
          onOpenEditor={(id) => { setShowFiles(false); setEditorNodeId(id); }}
        />
      )}

      {editorNodeId && (
        <ContentEditor nodeId={editorNodeId} onClose={() => setEditorNodeId(null)} />
      )}
    </div>
  );
}

export default function App() {
  return <AppInner />;
}
