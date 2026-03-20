import type { GraphNode, GraphEdge, NodeId, EdgeId } from './types';

export function getNodeNeighbors(
  nodeId: NodeId,
  edges: Record<EdgeId, GraphEdge>
): NodeId[] {
  return Object.values(edges)
    .filter((e) => e.source === nodeId || e.target === nodeId)
    .map((e) => (e.source === nodeId ? e.target : e.source));
}

export function getConnectedComponent(
  startId: NodeId,
  edges: Record<EdgeId, GraphEdge>
): Set<NodeId> {
  const visited = new Set<NodeId>();
  const queue = [startId];
  while (queue.length) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    getNodeNeighbors(id, edges).forEach((n) => queue.push(n));
  }
  return visited;
}

export function getNodeEdges(
  nodeId: NodeId,
  edges: Record<EdgeId, GraphEdge>
): GraphEdge[] {
  return Object.values(edges).filter(
    (e) => e.source === nodeId || e.target === nodeId
  );
}

export function getAllTags(nodes: Record<NodeId, GraphNode>): string[] {
  const tags = new Set<string>();
  Object.values(nodes).forEach((n) => n.tags.forEach((t) => tags.add(t)));
  return Array.from(tags).sort();
}
