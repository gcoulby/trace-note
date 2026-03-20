import JSZip from 'jszip';
import type { GraphNode, GraphEdge, NodeId, EdgeId, CaseManifest } from '../types';

interface WriteOptions {
  manifest: CaseManifest;
  nodes: Record<NodeId, GraphNode>;
  edges: Record<EdgeId, GraphEdge>;
  positions: Record<NodeId, { x: number; y: number }>;
  viewport: { x: number; y: number; zoom: number };
  layout: 'freeform' | 'dagre' | 'force';
  existingFile?: File | Blob | null;
  contentDirty?: Set<NodeId>;
  contentMap?: Map<NodeId, unknown>;
  assetMap?: Map<string, ArrayBuffer>;
}

export async function writeTnote(opts: WriteOptions): Promise<Blob> {
  let zip = new JSZip();

  // If there's an existing file, load it first to preserve assets and content blobs
  if (opts.existingFile) {
    try {
      zip = await JSZip.loadAsync(opts.existingFile);
    } catch {
      zip = new JSZip();
    }
  }

  // Update manifest with modified timestamp
  const manifest = { ...opts.manifest, modified: new Date().toISOString() };
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  // Write graph
  const graph = {
    nodes: Object.values(opts.nodes),
    edges: Object.values(opts.edges),
  };
  zip.file('graph.json', JSON.stringify(graph, null, 2));

  // Write canvas
  const canvas = {
    positions: opts.positions,
    viewport: opts.viewport,
    layout: opts.layout,
  };
  zip.file('canvas.json', JSON.stringify(canvas, null, 2));

  // Write dirty content blobs
  if (opts.contentDirty && opts.contentMap) {
    for (const nodeId of opts.contentDirty) {
      const content = opts.contentMap.get(nodeId);
      if (content !== undefined) {
        zip.file(`content/${nodeId}.json`, JSON.stringify(content, null, 2));
      }
    }
  }

  // Write new assets
  if (opts.assetMap) {
    for (const [assetId, buffer] of opts.assetMap) {
      zip.file(`assets/${assetId}`, buffer);
    }
  }

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}
