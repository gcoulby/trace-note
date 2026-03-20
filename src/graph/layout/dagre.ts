import dagre from 'dagre';
import type { NodeId, EdgeId, GraphEdge } from '../types';

const NODE_WIDTH = 220;
const NODE_HEIGHT = 130;

export function dagreLayout(
  nodeIds: NodeId[],
  edges: Record<EdgeId, GraphEdge>,
  pinnedNodes: Set<NodeId>,
  currentPositions: Record<NodeId, { x: number; y: number }>
): Record<NodeId, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 80 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const id of nodeIds) {
    g.setNode(id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  for (const edge of Object.values(edges)) {
    if (nodeIds.includes(edge.source) && nodeIds.includes(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(g);

  const positions: Record<NodeId, { x: number; y: number }> = {};
  for (const id of nodeIds) {
    if (pinnedNodes.has(id)) {
      positions[id] = currentPositions[id] ?? { x: 0, y: 0 };
    } else {
      const node = g.node(id);
      positions[id] = { x: node.x - NODE_WIDTH / 2, y: node.y - NODE_HEIGHT / 2 };
    }
  }

  return positions;
}
