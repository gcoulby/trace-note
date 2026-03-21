import { useEffect, useRef } from 'react';
import { useGraphStore } from '../store/graphStore';
import { useCanvasStore } from '../store/canvasStore';
import { useFileStore } from '../store/fileStore';
import { writeTnote } from '../file/tnoteWriter';
import { writeTnoteFile, downloadBlob } from '../file/fileHandle';
import { encryptBlob } from '../lib/crypto';

const DEBOUNCE_MS = 1500;

// Asset map lives outside Zustand
export const assetMap = new Map<string, ArrayBuffer>();
export const contentMap = new Map<string, unknown>();
export const contentDirty = new Set<string>();

let currentFileBlob: Blob | null = null;
export function setCurrentFileBlob(blob: Blob) { currentFileBlob = blob; }
export function getCurrentFileBlob() { return currentFileBlob; }

// ── Shared write logic ────────────────────────────────────────────────────────

async function performSave(
  handle: FileSystemFileHandle | null,
  filename: string,
  manifest: import('../types').CaseManifest,
  nodes: import('../types').GraphState['nodes'],
  edges: import('../types').GraphState['edges'],
  positions: Record<string, { x: number; y: number }>,
  viewport: { x: number; y: number; zoom: number },
  layout: 'freeform' | 'dagre' | 'force',
): Promise<void> {
  const { setSaveStatus, setLastSaved, passphrase } = useFileStore.getState();
  const blob = await writeTnote({
    manifest, nodes, edges, positions, viewport, layout,
    existingFile: currentFileBlob, contentDirty, contentMap, assetMap,
  });

  // Keep the unencrypted blob in memory for future merges
  currentFileBlob = blob;
  contentDirty.clear();

  // Encrypt before writing to disk if a passphrase is active
  const diskBlob = passphrase ? await encryptBlob(blob, passphrase) : blob;

  if (handle) await writeTnoteFile(handle, diskBlob);
  else downloadBlob(diskBlob, filename);

  setSaveStatus('saved');
  setLastSaved(new Date().toISOString());
}

// ── Imperative save (bypasses debounce) ───────────────────────────────────────

export async function saveNow(): Promise<void> {
  const { nodes, edges } = useGraphStore.getState();
  const { positions, viewport, layout } = useCanvasStore.getState();
  const { handle, filename, manifest, setSaveStatus } = useFileStore.getState();
  if (!manifest) return;
  setSaveStatus('saving');
  try {
    await performSave(handle, filename, manifest, nodes, edges, positions, viewport, layout);
  } catch (err) {
    console.error('saveNow failed', err);
    setSaveStatus('error');
  }
}

// ── Debounced auto-save hook ───────────────────────────────────────────────────

export function useAutoSave() {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const positions = useCanvasStore((s) => s.positions);
  const viewport = useCanvasStore((s) => s.viewport);
  const layout = useCanvasStore((s) => s.layout);
  const { handle, filename, manifest, setSaveStatus } = useFileStore();

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!manifest) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    setSaveStatus('unsaved');
    timerRef.current = setTimeout(() => {
      setSaveStatus('saving');
      void (async () => {
        try {
          await performSave(handle, filename, manifest, nodes, edges, positions, viewport, layout);
        } catch (err) {
          console.error('Auto-save failed', err);
          setSaveStatus('error');
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, positions, viewport, layout]);
}
