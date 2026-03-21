export type NodeId = string;
export type EdgeId = string;
export type AssetId = string;

export type NodeType =
  | 'person'
  | 'org'
  | 'location'
  | 'event'
  | 'document'
  | 'vehicle'
  | 'phone'
  | 'email'
  | 'social'
  | 'website'
  | 'financial'
  | 'device'
  | 'ip';

export interface NodeAttachment {
  id: AssetId;
  filename: string;
  size: number;
  mimeType: string;
}

export interface NodeLocation {
  lat: number;
  lng: number;
  label?: string;
}

export interface GraphNode {
  id: NodeId;
  label: string;
  summary?: string;
  notes?: string;
  tags: string[];
  thumbnail?: AssetId;
  location?: NodeLocation;
  featureDisplay?: 'image' | 'map';   // which feature shows on the card when both exist
  nodeType?: NodeType;
  attachments?: NodeAttachment[];
  hasContent: boolean;          // true when a BlockNote doc exists in content/<id>.json
  properties: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface GraphEdge {
  id: EdgeId;
  source: NodeId;
  target: NodeId;
  label?: string;
  notes?: string;
  createdAt: string;
}

export interface GraphState {
  nodes: Record<NodeId, GraphNode>;
  edges: Record<EdgeId, GraphEdge>;
}

export interface CanvasPosition {
  x: number;
  y: number;
}

export interface CanvasState {
  positions: Record<NodeId, CanvasPosition>;
  viewport: { x: number; y: number; zoom: number };
  layout: 'freeform' | 'dagre' | 'force';
  pinnedNodes: Set<NodeId>;
}

export interface CaseManifest {
  version: number;
  title: string;
  created: string;
  modified: string;
}

export interface CaseSettings {
  proxyUrl: string;
}

export const DEFAULT_CASE_SETTINGS: CaseSettings = {
  proxyUrl: '',
};

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export interface FileState {
  handle: FileSystemFileHandle | null;
  filename: string;
  saveStatus: SaveStatus;
  lastSaved: string | null;
}
