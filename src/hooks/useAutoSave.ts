import { useEffect, useRef } from 'react';
import { useGraphStore } from '../store/graphStore';
import { useCanvasStore } from '../store/canvasStore';
import { useFileStore } from '../store/fileStore';
import { writeTnote } from '../file/tnoteWriter';
import { writeTnoteFile, downloadBlob } from '../file/fileHandle';

const DEBOUNCE_MS = 1500;

// Asset map lives outside Zustand
export const assetMap = new Map<string, ArrayBuffer>();
export const contentMap = new Map<string, unknown>();
export const contentDirty = new Set<string>();

let currentFileBlob: Blob | null = null;
export function setCurrentFileBlob(blob: Blob) { currentFileBlob = blob; }
export function getCurrentFileBlob() { return currentFileBlob; }

export function useAutoSave() {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const positions = useCanvasStore((s) => s.positions);
  const viewport = useCanvasStore((s) => s.viewport);
  const layout = useCanvasStore((s) => s.layout);
  const { handle, filename, manifest, setSaveStatus, setLastSaved } = useFileStore();

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
          const blob = await writeTnote({
            manifest,
            nodes,
            edges,
            positions,
            viewport,
            layout,
            existingFile: currentFileBlob,
            contentDirty,
            contentMap,
            assetMap,
          });
          currentFileBlob = blob;
          contentDirty.clear();

          if (handle) {
            await writeTnoteFile(handle, blob);
          } else {
            downloadBlob(blob, filename);
          }
          setSaveStatus('saved');
          setLastSaved(new Date().toISOString());
        } catch (err) {
          console.error('Save failed', err);
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
