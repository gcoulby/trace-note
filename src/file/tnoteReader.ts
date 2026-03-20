import JSZip from 'jszip';
import type { GraphNode, GraphEdge, NodeId, EdgeId, CaseManifest } from '../types';

function mimeFromExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case 'png':  return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif':  return 'image/gif';
    case 'webp': return 'image/webp';
    case 'pdf':  return 'application/pdf';
    default:     return 'application/octet-stream';
  }
}

export interface LoadedAsset {
  buffer: ArrayBuffer;
  mimeType: string;
}

export interface TnoteData {
  manifest: CaseManifest;
  nodes: Record<NodeId, GraphNode>;
  edges: Record<EdgeId, GraphEdge>;
  positions: Record<NodeId, { x: number; y: number }>;
  viewport: { x: number; y: number; zoom: number };
  layout: 'freeform' | 'dagre' | 'force';
  assets: Record<string, LoadedAsset>;  // key = assetId (filename under assets/)
}

export async function readTnote(file: File | Blob): Promise<TnoteData> {
  const zip = await JSZip.loadAsync(file);

  const manifestRaw = await zip.file('manifest.json')?.async('string');
  if (!manifestRaw) throw new Error('Invalid .tnote: missing manifest.json');
  const manifest: CaseManifest = JSON.parse(manifestRaw) as CaseManifest;

  const graphRaw = await zip.file('graph.json')?.async('string');
  let nodes: Record<NodeId, GraphNode> = {};
  let edges: Record<EdgeId, GraphEdge> = {};
  if (graphRaw) {
    const graph = JSON.parse(graphRaw) as { nodes: GraphNode[]; edges: GraphEdge[] };
    nodes = Object.fromEntries((graph.nodes ?? []).map((n) => [n.id, n]));
    edges = Object.fromEntries((graph.edges ?? []).map((e) => [e.id, e]));
  }

  const canvasRaw = await zip.file('canvas.json')?.async('string');
  let positions: Record<NodeId, { x: number; y: number }> = {};
  let viewport = { x: 0, y: 0, zoom: 1 };
  let layout: 'freeform' | 'dagre' | 'force' = 'freeform';
  if (canvasRaw) {
    const canvas = JSON.parse(canvasRaw) as {
      positions?: Record<NodeId, { x: number; y: number }>;
      viewport?: { x: number; y: number; zoom: number };
      layout?: 'freeform' | 'dagre' | 'force';
    };
    positions = canvas.positions ?? {};
    viewport = canvas.viewport ?? viewport;
    layout = canvas.layout ?? 'freeform';
  }

  // Load all assets eagerly — they're usually small (thumbnails, attachments)
  const assets: Record<string, LoadedAsset> = {};
  const assetEntries = Object.entries(zip.files).filter(
    ([path]) => path.startsWith('assets/') && !path.endsWith('/')
  );
  await Promise.all(
    assetEntries.map(async ([path, entry]) => {
      const filename = path.slice('assets/'.length);
      const ext = filename.split('.').pop() ?? '';
      const buffer = await entry.async('arraybuffer');
      assets[filename] = { buffer, mimeType: mimeFromExt(ext) };
    })
  );

  return { manifest, nodes, edges, positions, viewport, layout, assets };
}

export async function loadNodeContent(file: File | Blob, nodeId: NodeId): Promise<unknown> {
  const zip = await JSZip.loadAsync(file);
  const raw = await zip.file(`content/${nodeId}.json`)?.async('string');
  return raw ? (JSON.parse(raw) as unknown) : null;
}
