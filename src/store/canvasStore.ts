import { create } from 'zustand';
import type { CanvasPosition, NodeId } from '../types';

interface CanvasStoreState {
  positions: Record<NodeId, CanvasPosition>;
  viewport: { x: number; y: number; zoom: number };
  layout: 'freeform' | 'dagre' | 'force';
  pinnedNodes: Set<NodeId>;
  setPosition: (id: NodeId, pos: CanvasPosition) => void;
  setPositions: (positions: Record<NodeId, CanvasPosition>) => void;
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  setLayout: (layout: 'freeform' | 'dagre' | 'force') => void;
  togglePin: (id: NodeId) => void;
  loadCanvas: (positions: Record<NodeId, CanvasPosition>, viewport: { x: number; y: number; zoom: number }, layout: 'freeform' | 'dagre' | 'force') => void;
  reset: () => void;
}

export const useCanvasStore = create<CanvasStoreState>((set) => ({
  positions: {},
  viewport: { x: 0, y: 0, zoom: 1 },
  layout: 'freeform',
  pinnedNodes: new Set(),

  setPosition: (id, pos) =>
    set((s) => ({ positions: { ...s.positions, [id]: pos } })),

  setPositions: (positions) => set({ positions }),

  setViewport: (viewport) => set({ viewport }),

  setLayout: (layout) => set({ layout }),

  togglePin: (id) =>
    set((s) => {
      const pinned = new Set(s.pinnedNodes);
      pinned.has(id) ? pinned.delete(id) : pinned.add(id);
      return { pinnedNodes: pinned };
    }),

  loadCanvas: (positions, viewport, layout) =>
    set({ positions, viewport, layout, pinnedNodes: new Set() }),

  reset: () =>
    set({ positions: {}, viewport: { x: 0, y: 0, zoom: 1 }, layout: 'freeform', pinnedNodes: new Set() }),
}));
