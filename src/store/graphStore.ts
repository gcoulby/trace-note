import { create } from 'zustand';
import type { GraphNode, GraphEdge, NodeId, EdgeId } from '../types';
import { nanoid } from 'nanoid';

interface GraphStoreState {
  nodes: Record<NodeId, GraphNode>;
  edges: Record<EdgeId, GraphEdge>;
  addNode: (node: Omit<GraphNode, 'id' | 'createdAt' | 'updatedAt'>) => GraphNode;
  updateNode: (id: NodeId, updates: Partial<GraphNode>) => void;
  deleteNode: (id: NodeId) => void;
  addEdge: (edge: Omit<GraphEdge, 'id' | 'createdAt'>) => GraphEdge;
  updateEdge: (id: EdgeId, updates: Partial<GraphEdge>) => void;
  deleteEdge: (id: EdgeId) => void;
  loadGraph: (nodes: Record<NodeId, GraphNode>, edges: Record<EdgeId, GraphEdge>) => void;
  reset: () => void;
}

export const useGraphStore = create<GraphStoreState>((set) => ({
  nodes: {},
  edges: {},

  addNode: (nodeData) => {
    const now = new Date().toISOString();
    const node: GraphNode = {
      ...nodeData,
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ nodes: { ...s.nodes, [node.id]: node } }));
    return node;
  },

  updateNode: (id, updates) => {
    set((s) => ({
      nodes: {
        ...s.nodes,
        [id]: { ...s.nodes[id], ...updates, updatedAt: new Date().toISOString() },
      },
    }));
  },

  deleteNode: (id) => {
    set((s) => {
      const nodes = { ...s.nodes };
      delete nodes[id];
      const edges = Object.fromEntries(
        Object.entries(s.edges).filter(([, e]) => e.source !== id && e.target !== id)
      );
      return { nodes, edges };
    });
  },

  addEdge: (edgeData) => {
    const edge: GraphEdge = {
      ...edgeData,
      id: nanoid(),
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ edges: { ...s.edges, [edge.id]: edge } }));
    return edge;
  },

  updateEdge: (id, updates) => {
    set((s) => ({
      edges: { ...s.edges, [id]: { ...s.edges[id], ...updates } },
    }));
  },

  deleteEdge: (id) => {
    set((s) => {
      const edges = { ...s.edges };
      delete edges[id];
      return { edges };
    });
  },

  loadGraph: (nodes, edges) => set({ nodes, edges }),

  reset: () => set({ nodes: {}, edges: {} }),
}));
