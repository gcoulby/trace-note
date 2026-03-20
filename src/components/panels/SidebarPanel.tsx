import { useState } from 'react';
import { Shield, Plus, ChevronDown, ChevronRight, Circle } from 'lucide-react';
import { useGraphStore } from '../../store/graphStore';
import { useFileStore } from '../../store/fileStore';
import { getAllTags } from '../../graph/graphOps';
import { NODE_TYPE_CONFIG, ALL_NODE_TYPES } from '../../lib/nodeTypeConfig';
import type { NodeType } from '../../types';

interface Props {
  activeTag: string | null;
  onTagClick: (tag: string | null) => void;
  activeType: NodeType | null;
  onTypeClick: (type: NodeType | null) => void;
  onFocusNode: (nodeId: string) => void;
  onAddNode: () => void;
  selectedNodeId: string | null;
}

export function SidebarPanel({
  activeTag, onTagClick, activeType, onTypeClick, onFocusNode, onAddNode, selectedNodeId,
}: Props) {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const manifest = useFileStore((s) => s.manifest);
  const allTags = getAllTags(nodes);

  const [nodesOpen, setNodesOpen] = useState(true);
  const [typesOpen, setTypesOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(false);

  const allNodeValues = Object.values(nodes);

  // Active types that actually exist in the case
  const usedTypes = ALL_NODE_TYPES.filter((t) => allNodeValues.some((n) => n.nodeType === t));

  // Apply both filters when listing nodes
  const visibleNodes = allNodeValues
    .filter((n) => (!activeType || n.nodeType === activeType) && (!activeTag || n.tags.includes(activeTag)))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const hasActiveFilter = activeType || activeTag;

  return (
    <div className="w-55 h-full bg-[#161b22] border-r border-[#30363d] flex flex-col overflow-hidden">

      {/* Case header */}
      <div className="px-4 py-3.5 border-b border-[#30363d] shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <Shield size={12} className="text-amber-400" />
          <span className="text-[10px] uppercase tracking-wider text-amber-400 font-mono">Case</span>
        </div>
        <div className="text-sm font-semibold text-[#e6edf3] truncate leading-tight">
          {manifest?.title ?? 'Untitled'}
        </div>
        <div className="flex gap-3 mt-1.5 text-[10px] font-mono text-[#484f58]">
          <span>{allNodeValues.length} nodes</span>
          <span>{Object.keys(edges).length} edges</span>
        </div>
        {manifest?.created && (
          <div className="text-[10px] font-mono text-[#3a3f47] mt-0.5">
            {new Date(manifest.created).toLocaleDateString()}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* Active filter pill */}
        {hasActiveFilter && (
          <div className="px-3 pt-2">
            <button
              onClick={() => { onTypeClick(null); onTagClick(null); }}
              className="w-full flex items-center gap-1.5 px-2 py-1 text-[10px] text-amber-400 bg-amber-400/10 rounded border border-amber-400/30 hover:bg-amber-400/20 transition-colors"
            >
              <span className="flex-1 text-left truncate">
                {activeType && NODE_TYPE_CONFIG[activeType].label}
                {activeType && activeTag && ' · '}
                {activeTag && `#${activeTag}`}
              </span>
              <span>✕</span>
            </button>
          </div>
        )}

        {/* Node list */}
        <div className="border-b border-[#21262d] mt-2">
          <button
            onClick={() => setNodesOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2 text-[10px] uppercase tracking-wider text-[#8b949e] hover:text-[#e6edf3] transition-colors"
          >
            <span>Nodes ({visibleNodes.length})</span>
            {nodesOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          </button>

          {nodesOpen && (
            <div className="pb-1">
              {visibleNodes.length === 0 && (
                <div className="px-4 py-1 text-[11px] text-[#3a3f47]">
                  {hasActiveFilter ? 'No matches' : 'No nodes yet'}
                </div>
              )}
              {visibleNodes.map((node) => {
                const typeCfg = node.nodeType ? NODE_TYPE_CONFIG[node.nodeType] : null;
                return (
                  <button
                    key={node.id}
                    onClick={() => onFocusNode(node.id)}
                    className={[
                      'w-full flex items-start gap-2 px-4 py-1.5 text-left transition-colors group',
                      selectedNodeId === node.id
                        ? 'bg-amber-400/10 text-amber-400'
                        : 'text-[#8b949e] hover:bg-[#1c2333] hover:text-[#e6edf3]',
                    ].join(' ')}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                      style={{ backgroundColor: typeCfg?.dot ?? '#484f58' }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-medium leading-tight truncate">{node.label}</div>
                      {node.nodeType && (
                        <div className="text-[9px] font-mono text-[#484f58]">{NODE_TYPE_CONFIG[node.nodeType].label}</div>
                      )}
                    </div>
                  </button>
                );
              })}
              <button
                onClick={onAddNode}
                className="w-full flex items-center gap-2 px-4 py-1.5 text-[11px] text-[#484f58] hover:text-amber-400 transition-colors"
              >
                <Plus size={10} />Add node
              </button>
            </div>
          )}
        </div>

        {/* Type filter */}
        {usedTypes.length > 0 && (
          <div className="border-b border-[#21262d]">
            <button
              onClick={() => setTypesOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-2 text-[10px] uppercase tracking-wider text-[#8b949e] hover:text-[#e6edf3] transition-colors"
            >
              <span>Types</span>
              {typesOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            </button>

            {typesOpen && (
              <div className="pb-2">
                {usedTypes.map((type) => {
                  const cfg = NODE_TYPE_CONFIG[type];
                  const count = allNodeValues.filter((n) => n.nodeType === type).length;
                  return (
                    <button
                      key={type}
                      onClick={() => onTypeClick(activeType === type ? null : type)}
                      className={[
                        'w-full flex items-center justify-between px-4 py-1.5 text-[11px] transition-colors',
                        activeType === type
                          ? 'bg-amber-400/10 text-amber-400'
                          : 'text-[#8b949e] hover:bg-[#1c2333] hover:text-[#e6edf3]',
                      ].join(' ')}
                    >
                      <span className="flex items-center gap-2">
                        <span style={{ color: cfg.dot }}>{cfg.icon}</span>
                        {cfg.label}
                      </span>
                      <span className="text-[10px] text-[#3a3f47]">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tag filter */}
        {allTags.length > 0 && (
          <div>
            <button
              onClick={() => setTagsOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-2 text-[10px] uppercase tracking-wider text-[#8b949e] hover:text-[#e6edf3] transition-colors"
            >
              <span>Tags</span>
              {tagsOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            </button>

            {tagsOpen && (
              <div className="pb-2">
                {allTags.map((tag) => {
                  const count = allNodeValues.filter((n) => n.tags.includes(tag)).length;
                  return (
                    <button
                      key={tag}
                      onClick={() => onTagClick(activeTag === tag ? null : tag)}
                      className={[
                        'w-full flex items-center justify-between px-4 py-1.5 text-[11px] transition-colors',
                        activeTag === tag ? 'text-amber-400 bg-amber-400/10' : 'text-[#8b949e] hover:bg-[#1c2333] hover:text-[#e6edf3]',
                      ].join(' ')}
                    >
                      <span className="flex items-center gap-1.5">
                        <Circle size={6} className="fill-current" />
                        {tag}
                      </span>
                      <span className="text-[10px] text-[#3a3f47]">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
