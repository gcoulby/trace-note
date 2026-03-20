import { useCallback } from 'react';
import { useGraphStore } from '../store/graphStore';
import { useCanvasStore } from '../store/canvasStore';
import { dagreLayout } from '../graph/layout/dagre';
import { forceLayout } from '../graph/layout/force';

export function useLayout() {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const { positions, pinnedNodes, setPositions, setLayout } = useCanvasStore();

  const applyDagre = useCallback(() => {
    const newPositions = dagreLayout(
      Object.keys(nodes),
      edges,
      pinnedNodes,
      positions
    );
    setPositions(newPositions);
    setLayout('dagre');
  }, [nodes, edges, pinnedNodes, positions, setPositions, setLayout]);

  const applyForce = useCallback(async () => {
    const newPositions = await forceLayout(
      Object.keys(nodes),
      edges,
      pinnedNodes,
      positions
    );
    setPositions(newPositions);
    setLayout('force');
  }, [nodes, edges, pinnedNodes, positions, setPositions, setLayout]);

  return { applyDagre, applyForce };
}
