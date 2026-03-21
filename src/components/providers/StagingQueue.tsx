import { CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { useProviderStore } from '../../providers/providerStore';
import { useGraphStore } from '../../store/graphStore';
import type { StagedResult, StagedNode } from '../../providers/types';
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

  function handleApprove(result: StagedResult) {
    // Build a label→id map from existing nodes + newly added
    const labelToId = new Map<string, string>();
    Object.values(existingNodes).forEach((n) => labelToId.set(n.label.toLowerCase(), n.id));

    const newNodeIds = new Map<string, string>();

    // Add staged nodes
    let nodeCount = 0;
    for (const sn of result.nodes) {
      const created = addNode({
        label:      sn.label,
        summary:    sn.summary,
        tags:       sn.tags,
        properties: sn.properties,
        nodeType:   sn.nodeType,
        hasContent: false,
      });
      newNodeIds.set(sn.label.toLowerCase(), created.id);
      labelToId.set(sn.label.toLowerCase(), created.id);
      nodeCount++;
    }

    // Add staged edges
    let edgeCount = 0;
    for (const se of result.edges) {
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
          <div key={result.id} className="border-b border-[#30363d] p-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-[#e6edf3]">{result.providerName}</span>
                  <span className="text-[10px] font-mono text-[#484f58] bg-[#0d1117] px-1.5 py-0.5 rounded">
                    {result.seedType}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-amber-400 mt-0.5">{result.seedValue}</div>
                <div className="text-[10px] text-[#3a3f47] mt-0.5 font-mono">{formatTs(result.createdAt)}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => handleApprove(result)}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] text-[#3fb950] border border-[#3fb950]/30 rounded hover:bg-[#3fb950]/10 transition-colors"
                  title="Approve — commit to graph"
                >
                  <CheckCircle2 size={11} /> Approve
                </button>
                <button
                  onClick={() => dismissS(result.id)}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] text-[#484f58] border border-[#30363d] rounded hover:text-red-400 hover:border-red-400/30 transition-colors"
                  title="Dismiss"
                >
                  <XCircle size={11} /> Dismiss
                </button>
              </div>
            </div>

            {/* Node candidates */}
            {result.nodes.length > 0 && (
              <div className="mb-2">
                <div className="text-[9px] uppercase tracking-wider text-[#484f58] font-mono mb-1">
                  {result.nodes.length} node{result.nodes.length !== 1 ? 's' : ''}
                </div>
                <div className="space-y-1">
                  {result.nodes.map((n, i) => {
                    const cfg = NODE_TYPE_CONFIG[n.nodeType as NodeType];
                    return (
                      <div key={i} className="flex items-start gap-2 bg-[#0d1117] rounded px-2 py-1.5">
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
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Edge candidates */}
            {result.edges.length > 0 && (
              <div>
                <div className="text-[9px] uppercase tracking-wider text-[#484f58] font-mono mb-1">
                  {result.edges.length} edge{result.edges.length !== 1 ? 's' : ''}
                </div>
                <div className="space-y-1">
                  {result.edges.map((e, i) => (
                    <div key={i} className="flex items-center gap-1 text-[10px] font-mono bg-[#0d1117] rounded px-2 py-1">
                      <span className="text-[#e6edf3]">{e.sourceLabel}</span>
                      <span className="text-[#484f58] mx-1">→</span>
                      <span className="text-[#e6edf3]">{e.targetLabel}</span>
                      {e.edgeLabel && (
                        <span className="text-[#484f58] ml-1 italic">({e.edgeLabel})</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
