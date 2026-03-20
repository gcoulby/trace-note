import { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  MiniMap,
  Controls,
  ConnectionMode,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type NodeTypes,
  type EdgeTypes,
  type OnConnectEnd,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useGraphStore } from '../../store/graphStore';
import { useCanvasStore } from '../../store/canvasStore';
import { NodeCard } from './NodeCard';
import { EdgeLine } from './EdgeLine';
import { getCachedAsset } from '../../lib/assetCache';

const nodeTypes: NodeTypes = { nodeCard: NodeCard as NodeTypes[string] };
const edgeTypes: EdgeTypes = { edgeLine: EdgeLine as EdgeTypes[string] };

import type { NodeType } from '../../types';

interface CaseBoardInnerProps {
  onNodeDoubleClick: (nodeId: string) => void;
  onNodeContextMenu: (nodeId: string, x: number, y: number) => void;
  onEdgeClick: (edgeId: string) => void;
  onCanvasDoubleClick: (x: number, y: number) => void;
  onCanvasContextMenu: (x: number, y: number, flowX: number, flowY: number) => void;
  onDropCreateNode: (fromNodeId: string | null, pos: { x: number; y: number }) => void;
  activeTag: string | null;
  activeType: NodeType | null;
  focusNodeId: string | null;
  onFocusConsumed: () => void;
  fitViewTrigger: number;
}

function CaseBoardInner({
  onNodeDoubleClick,
  onNodeContextMenu,
  onEdgeClick,
  onCanvasDoubleClick,
  onCanvasContextMenu,
  onDropCreateNode,
  activeTag,
  activeType,
  focusNodeId,
  onFocusConsumed,
  fitViewTrigger,
}: CaseBoardInnerProps) {
  const { nodes: graphNodes, edges: graphEdges, addEdge: addGraphEdge } = useGraphStore();
  const { positions, setPosition, viewport, setViewport } = useCanvasStore();
  const { screenToFlowPosition, setCenter, fitView } = useReactFlow();

  // Pan to a specific node (from sidebar or search)
  useEffect(() => {
    if (!focusNodeId) return;
    const pos = positions[focusNodeId];
    if (pos) setCenter(pos.x + 110, pos.y + 65, { zoom: 1.2, duration: 400 });
    onFocusConsumed();
  }, [focusNodeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fit view on trigger (node create, layout apply, etc.)
  useEffect(() => {
    if (fitViewTrigger > 0) fitView({ duration: 400, padding: 0.12 });
  }, [fitViewTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const rfNodes: Node[] = useMemo(() =>
    Object.values(graphNodes).map((n) => ({
      id: n.id,
      type: 'nodeCard',
      position: positions[n.id] ?? { x: Math.random() * 600, y: Math.random() * 400 },
      data: {
        node: n,
        thumbnailUrl: n.thumbnail ? getCachedAsset(n.thumbnail) : undefined,
        dimmed: (activeTag ? !n.tags.includes(activeTag) : false) ||
                (activeType ? n.nodeType !== activeType : false),
        onEdit: () => onNodeDoubleClick(n.id),
      },
    })),
    [graphNodes, positions, activeTag, activeType, onNodeDoubleClick]
  );

  const rfEdges: Edge[] = useMemo(() =>
    Object.values(graphEdges).map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'edgeLine',
      data: { label: e.label },
    })),
    [graphEdges]
  );

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    changes.forEach((change) => {
      if (change.type === 'position' && change.position) {
        setPosition(change.id, change.position);
      }
    });
  }, [setPosition]);

  const onConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target && connection.source !== connection.target) {
      addGraphEdge({ source: connection.source, target: connection.target });
    }
  }, [addGraphEdge]);

  // Drag a handle and release on empty canvas → create a new node
  const onConnectEnd: OnConnectEnd = useCallback((event, connectionState) => {
    if (!connectionState.isValid) {
      const { clientX, clientY } =
        'changedTouches' in event ? event.changedTouches[0] : (event as MouseEvent);
      const pos = screenToFlowPosition({ x: clientX, y: clientY });
      onDropCreateNode(connectionState.fromNode?.id ?? null, pos);
    }
  }, [screenToFlowPosition, onDropCreateNode]);

  const onNodeDoubleClickHandler = useCallback((_: React.MouseEvent, node: Node) => {
    onNodeDoubleClick(node.id);
  }, [onNodeDoubleClick]);

  const onEdgeClickHandler = useCallback((_: React.MouseEvent, edge: Edge) => {
    onEdgeClick(edge.id);
  }, [onEdgeClick]);

  // Canvas double-click: only fires on the pane, not on nodes/edges
  const onDoubleClickHandler = useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest('.react-flow__node') || target.closest('.react-flow__edge-wrapper')) return;
    const pos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    onCanvasDoubleClick(pos.x, pos.y);
  }, [screenToFlowPosition, onCanvasDoubleClick]);

  const onNodeContextMenuHandler = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    onNodeContextMenu(node.id, event.clientX, event.clientY);
  }, [onNodeContextMenu]);

  const onPaneContextMenuHandler = useCallback((event: React.MouseEvent | MouseEvent) => {
    event.preventDefault();
    const e = event as React.MouseEvent;
    const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    onCanvasContextMenu(e.clientX, e.clientY, flowPos.x, flowPos.y);
  }, [screenToFlowPosition, onCanvasContextMenu]);

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      connectionMode={ConnectionMode.Loose}
      onNodesChange={onNodesChange}
      onConnect={onConnect}
      onConnectEnd={onConnectEnd}
      onNodeDoubleClick={onNodeDoubleClickHandler}
      onEdgeClick={onEdgeClickHandler}
      onDoubleClick={onDoubleClickHandler}
      onNodeContextMenu={onNodeContextMenuHandler}
      onPaneContextMenu={onPaneContextMenuHandler}
      defaultViewport={viewport}
      onViewportChange={setViewport}
      snapToGrid
      snapGrid={[20, 20]}
      deleteKeyCode="Delete"
      fitView={false}
      proOptions={{ hideAttribution: true }}
      colorMode="dark"
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={20}
        size={1}
        color="#1e2430"
      />
      <Controls />
      <MiniMap
        nodeColor={(node) => node.selected ? '#fbbf24' : '#3a4050'}
        maskColor="rgba(13,17,23,0.85)"
        style={{ background: '#0d1117' }}
      />
    </ReactFlow>
  );
}

interface CaseBoardProps {
  onNodeDoubleClick: (nodeId: string) => void;
  onNodeContextMenu: (nodeId: string, x: number, y: number) => void;
  onEdgeClick: (edgeId: string) => void;
  onCanvasDoubleClick: (x: number, y: number) => void;
  onCanvasContextMenu: (x: number, y: number, flowX: number, flowY: number) => void;
  onDropCreateNode: (fromNodeId: string | null, pos: { x: number; y: number }) => void;
  activeTag: string | null;
  activeType: NodeType | null;
  focusNodeId: string | null;
  onFocusConsumed: () => void;
  fitViewTrigger: number;
}

export function CaseBoard(props: CaseBoardProps) {
  return (
    <ReactFlowProvider>
      <CaseBoardInner {...props} />
    </ReactFlowProvider>
  );
}
