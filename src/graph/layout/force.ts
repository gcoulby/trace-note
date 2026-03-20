import * as d3 from 'd3-force';
import type { NodeId, EdgeId, GraphEdge } from '../types';

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  fx?: number;
  fy?: number;
}

export function forceLayout(
  nodeIds: NodeId[],
  edges: Record<EdgeId, GraphEdge>,
  pinnedNodes: Set<NodeId>,
  currentPositions: Record<NodeId, { x: number; y: number }>
): Promise<Record<NodeId, { x: number; y: number }>> {
  return new Promise((resolve) => {
    const simNodes: SimNode[] = nodeIds.map((id) => ({
      id,
      x: currentPositions[id]?.x ?? Math.random() * 800,
      y: currentPositions[id]?.y ?? Math.random() * 600,
      fx: pinnedNodes.has(id) ? (currentPositions[id]?.x ?? undefined) : undefined,
      fy: pinnedNodes.has(id) ? (currentPositions[id]?.y ?? undefined) : undefined,
    }));

    const simLinks = Object.values(edges)
      .filter((e) => nodeIds.includes(e.source) && nodeIds.includes(e.target))
      .map((e) => ({ source: e.source, target: e.target }));

    const simulation = d3
      .forceSimulation<SimNode>(simNodes)
      .force('link', d3.forceLink<SimNode, d3.SimulationLinkDatum<SimNode>>(simLinks).id((d) => d.id).distance(200))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(600, 400))
      .stop();

    simulation.tick(300);

    const positions: Record<NodeId, { x: number; y: number }> = {};
    simNodes.forEach((n) => {
      positions[n.id] = { x: n.x ?? 0, y: n.y ?? 0 };
    });

    resolve(positions);
  });
}
