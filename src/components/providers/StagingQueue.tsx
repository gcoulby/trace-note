import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { useProviderStore } from '../../providers/providerStore';
import { useGraphStore } from '../../store/graphStore';
import type { StagedResult, StagedNode, StagedEdge } from '../../providers/types';
import { NODE_TYPE_CONFIG } from '../../lib/nodeTypeConfig';
import type { NodeType } from '../../types';

const CONFIDENCE_STYLE: Record<StagedNode['confidence'], string> = {
  high:   'text-[#3fb950] border-[#3fb950]/30 bg-[#3fb950]/10',
  medium: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
  low:    'text-[#8b949e] border-[#30363d] bg-transparent',
};

function formatTs(ms: number) {
  return new Date(ms).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
}

// ── Per-result card ───────────────────────────────────────────────────────────

interface CardProps {
  result:    StagedResult;
  onApprove: (nodes: StagedNode[], edges: StagedEdge[]) => void;
  onDismiss: () => void;
}

function StagedResultCard({ result, onApprove, onDismiss }: CardProps) {
  const [selNodes, setSelNodes] = useState<Set<number>>(
    () => new Set(result.nodes.map((_, i) => i)),
  );
  const [selEdges, setSelEdges] = useState<Set<number>>(
    () => new Set(result.edges.map((_, i) => i)),
  );

  const totalItems    = result.nodes.length + result.edges.length;
  const selectedCount = selNodes.size + selEdges.size;
  const allSelected   = selectedCount === totalItems && totalItems > 0;
  const noneSelected  = selectedCount === 0;

  const headerCheckRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (headerCheckRef.current) {
      headerCheckRef.current.indeterminate = !allSelected && !noneSelected;
    }
  }, [allSelected, noneSelected]);

  function toggleAll() {
    if (allSelected) {
      setSelNodes(new Set());
      setSelEdges(new Set());
    } else {
      setSelNodes(new Set(result.nodes.map((_, i) => i)));
      setSelEdges(new Set(result.edges.map((_, i) => i)));
    }
  }

  function toggleNode(i: number) {
    setSelNodes((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  function toggleEdge(i: number) {
    setSelEdges((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  function handleApprove() {
    onApprove(
      result.nodes.filter((_, i) => selNodes.has(i)),
      result.edges.filter((_, i) => selEdges.has(i)),
    );
  }

  const nodeCount = result.nodes.length;
  const edgeCount = result.edges.length;
  const nodeSection = nodeCount > 0;
  const edgeSection = edgeCount > 0;

  const nodeSelCount = selNodes.size;
  const edgeSelCount = selEdges.size;

  return (
    <div className="border-b border-[#30363d] p-3">
      {/* Header row */}
      <div className="flex items-start gap-2 mb-2">
        {/* Select-all checkbox */}
        <label className="flex items-center mt-0.5 cursor-pointer shrink-0" title="Select / deselect all">
          <input
            ref={headerCheckRef}
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="w-3 h-3 accent-amber-400 cursor-pointer"
          />
        </label>

        {/* Meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-[#e6edf3]">{result.providerName}</span>
            <span className="text-[10px] font-mono text-[#484f58] bg-[#0d1117] px-1.5 py-0.5 rounded">
              {result.seedType}
            </span>
          </div>
          <div className="text-[11px] font-mono text-amber-400 mt-0.5">{result.seedValue}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-[#3a3f47] font-mono">{formatTs(result.createdAt)}</span>
            <span className="text-[10px] text-[#484f58] font-mono">
              {selectedCount}/{totalItems} selected
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1 shrink-0">
          <button
            onClick={handleApprove}
            disabled={selectedCount === 0}
            className="flex items-center gap-1 px-2 py-1 text-[10px] text-[#3fb950] border border-[#3fb950]/30 rounded hover:bg-[#3fb950]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Approve selected — commit to graph"
          >
            <CheckCircle2 size={11} />
            Approve {selectedCount < totalItems && selectedCount > 0 ? `(${selectedCount})` : ''}
          </button>
          <button
            onClick={onDismiss}
            className="flex items-center gap-1 px-2 py-1 text-[10px] text-[#484f58] border border-[#30363d] rounded hover:text-red-400 hover:border-red-400/30 transition-colors"
            title="Dismiss entire result"
          >
            <XCircle size={11} /> Dismiss
          </button>
        </div>
      </div>

      {/* Node candidates */}
      {nodeSection && (
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-1">
            <label className="flex items-center gap-1 cursor-pointer" title="Select / deselect all nodes">
              <NodeSectionCheckbox
                count={nodeCount}
                selCount={nodeSelCount}
                onToggle={() => {
                  if (nodeSelCount === nodeCount) {
                    setSelNodes(new Set());
                  } else {
                    setSelNodes(new Set(result.nodes.map((_, i) => i)));
                  }
                }}
              />
            </label>
            <span className="text-[9px] uppercase tracking-wider text-[#484f58] font-mono">
              {nodeCount} node{nodeCount !== 1 ? 's' : ''}
              {nodeSelCount < nodeCount && (
                <span className="text-amber-400 ml-1">· {nodeSelCount} selected</span>
              )}
            </span>
          </div>
          <div className="space-y-1">
            {result.nodes.map((n, i) => {
              const cfg     = NODE_TYPE_CONFIG[n.nodeType as NodeType];
              const checked = selNodes.has(i);
              return (
                <label
                  key={i}
                  className={`flex items-start gap-2 rounded px-2 py-1.5 cursor-pointer transition-colors ${
                    checked ? 'bg-[#0d1117]' : 'bg-[#0d1117]/50 opacity-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleNode(i)}
                    className="mt-0.5 w-3 h-3 accent-amber-400 cursor-pointer shrink-0"
                  />
                  <span
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0"
                    style={{ color: cfg?.color ?? '#8b949e', background: `${cfg?.color ?? '#8b949e'}18` }}
                  >
                    {n.nodeType}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] text-[#e6edf3] font-medium">{n.label}</span>
                    {n.summary && (
                      <span className="text-[10px] text-[#484f58] ml-2">{n.summary}</span>
                    )}
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono shrink-0 ${CONFIDENCE_STYLE[n.confidence]}`}>
                    {n.confidence}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Edge candidates */}
      {edgeSection && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <label className="flex items-center gap-1 cursor-pointer" title="Select / deselect all edges">
              <NodeSectionCheckbox
                count={edgeCount}
                selCount={edgeSelCount}
                onToggle={() => {
                  if (edgeSelCount === edgeCount) {
                    setSelEdges(new Set());
                  } else {
                    setSelEdges(new Set(result.edges.map((_, i) => i)));
                  }
                }}
              />
            </label>
            <span className="text-[9px] uppercase tracking-wider text-[#484f58] font-mono">
              {edgeCount} edge{edgeCount !== 1 ? 's' : ''}
              {edgeSelCount < edgeCount && (
                <span className="text-amber-400 ml-1">· {edgeSelCount} selected</span>
              )}
            </span>
          </div>
          <div className="space-y-1">
            {result.edges.map((e, i) => {
              const checked = selEdges.has(i);
              return (
                <label
                  key={i}
                  className={`flex items-center gap-2 text-[10px] font-mono rounded px-2 py-1 cursor-pointer transition-colors ${
                    checked ? 'bg-[#0d1117]' : 'bg-[#0d1117]/50 opacity-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleEdge(i)}
                    className="w-3 h-3 accent-amber-400 cursor-pointer shrink-0"
                  />
                  <span className="text-[#e6edf3] truncate max-w-[35%]">{e.sourceLabel}</span>
                  <span className="text-[#484f58] shrink-0">→</span>
                  {e.edgeLabel && (
                    <span className="text-amber-400/70 shrink-0 italic">{e.edgeLabel}</span>
                  )}
                  {e.edgeLabel && <span className="text-[#484f58] shrink-0">→</span>}
                  <span className="text-[#e6edf3] truncate max-w-[35%]">{e.targetLabel}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Checkbox for a section (nodes / edges) with indeterminate support
function NodeSectionCheckbox({
  count, selCount, onToggle,
}: { count: number; selCount: number; onToggle: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const allSel  = selCount === count;
  const noneSel = selCount === 0;

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !allSel && !noneSel;
  }, [allSel, noneSel]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={allSel}
      onChange={onToggle}
      className="w-3 h-3 accent-amber-400 cursor-pointer"
    />
  );
}

// ── Main queue ────────────────────────────────────────────────────────────────

export function StagingQueue() {
  const staged      = useProviderStore((s) => s.staged);
  const approveS    = useProviderStore((s) => s.approveStaged);
  const dismissS    = useProviderStore((s) => s.dismissStaged);
  const clearStaged = useProviderStore((s) => s.clearStaged);
  const addLogEntry = useProviderStore((s) => s.addLogEntry);
  const addNode     = useGraphStore((s) => s.addNode);
  const addEdge     = useGraphStore((s) => s.addEdge);
  const existingNodes = useGraphStore((s) => s.nodes);

  const pending = staged.filter((r) => !r.approved && !r.dismissed);

  function commitSelection(result: StagedResult, nodes: StagedNode[], edges: StagedEdge[]) {
    const labelToId = new Map<string, string>();
    Object.values(existingNodes).forEach((n) => labelToId.set(n.label.toLowerCase(), n.id));

    let nodeCount = 0;
    for (const sn of nodes) {
      const created = addNode({
        label:      sn.label,
        summary:    sn.summary,
        tags:       sn.tags,
        properties: sn.properties,
        nodeType:   sn.nodeType,
        hasContent: false,
      });
      labelToId.set(sn.label.toLowerCase(), created.id);
      nodeCount++;
    }

    let edgeCount = 0;
    for (const se of edges) {
      const srcId = labelToId.get(se.sourceLabel.toLowerCase());
      const tgtId = labelToId.get(se.targetLabel.toLowerCase());
      if (srcId && tgtId && srcId !== tgtId) {
        addEdge({ source: srcId, target: tgtId, label: se.edgeLabel });
        edgeCount++;
      }
    }

    approveS(result.id);
    addLogEntry(
      result.providerId,
      result.providerName,
      'success',
      `Approved: committed ${nodeCount} node(s), ${edgeCount} edge(s) from seed "${result.seedValue}"`,
      { nodes: nodeCount, edges: edgeCount, seed: result.seedValue },
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#30363d] shrink-0">
        <span className="text-[10px] uppercase tracking-wider text-[#484f58] font-mono">
          Staging Queue {pending.length > 0 && <span className="text-amber-400">({pending.length})</span>}
        </span>
        {staged.length > 0 && (
          <button
            onClick={clearStaged}
            className="p-1 text-[#484f58] hover:text-red-400 transition-colors rounded"
            title="Clear all"
          >
            <Trash2 size={11} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {pending.length === 0 && (
          <div className="px-3 py-8 text-center text-[11px] text-[#484f58]">
            No staged results pending review
          </div>
        )}

        {pending.map((result) => (
          <StagedResultCard
            key={result.id}
            result={result}
            onApprove={(nodes, edges) => commitSelection(result, nodes, edges)}
            onDismiss={() => dismissS(result.id)}
          />
        ))}
      </div>
    </div>
  );
}
