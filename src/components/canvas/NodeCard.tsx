import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Pencil, FileText, BookOpen, Paperclip, MapPin } from 'lucide-react';
import type { GraphNode } from '../../types';
import { NODE_TYPE_CONFIG } from '../../lib/nodeTypeConfig';
import { osmTileUrl, pinPercentInTile } from '../../lib/locationUtils';

export interface NodeCardData extends Record<string, unknown> {
  node: GraphNode;
  thumbnailUrl?: string;
  dimmed?: boolean;
  onEdit?: () => void;
}

export const NodeCard = memo(({ data, selected }: NodeProps) => {
  const { node, thumbnailUrl, dimmed, onEdit } = data as NodeCardData;
  const typeConfig = node.nodeType ? NODE_TYPE_CONFIG[node.nodeType] : null;

  // Determine what to show as the card feature (top image area)
  const hasMap   = Boolean(node.location);
  const showMap  = hasMap && (node.featureDisplay === 'map' || (!thumbnailUrl && hasMap));
  const showImg  = Boolean(thumbnailUrl) && !showMap;

  const TILE_ZOOM = 14;
  const tileUrl  = showMap ? osmTileUrl(node.location!.lat, node.location!.lng, TILE_ZOOM) : null;
  const pinPos   = showMap ? pinPercentInTile(node.location!.lat, node.location!.lng, TILE_ZOOM) : null;

  // Top 3 properties to preview on the card
  const previewProps = Object.entries(node.properties).slice(0, 3);

  const hasNotes       = Boolean(node.notes?.trim());
  const hasDoc         = node.hasContent;
  const hasAttachments = (node.attachments?.length ?? 0) > 0;
  const hasLocation    = Boolean(node.location);

  return (
    <div
      className={[
        'relative w-55 rounded border transition-all duration-150 group',
        selected
          ? 'border-amber-400 bg-[#1c2333] shadow-[0_0_0_2px_rgba(251,191,36,0.15)]'
          : 'border-[#30363d] bg-[#161b22] hover:border-[#484f58]',
        dimmed ? 'opacity-20' : 'opacity-100',
      ].join(' ')}
    >
      {/* Drawing-pin handle — single port, bidirectional via ConnectionMode.Loose */}
      <Handle type="source" position={Position.Top} id="pin" />

      {/* Feature: map tile with pin */}
      {showMap && tileUrl && pinPos && (
        <div className="relative w-full h-20 overflow-hidden rounded-t border-b border-[#30363d]">
          <img src={tileUrl} alt="" className="w-full h-full object-cover" />
          {/* Pin — positioned at the lat/lng within the tile */}
          <div
            className="absolute"
            style={{ left: `${pinPos.px}%`, top: `${pinPos.py}%`, transform: 'translate(-50%, -50%)' }}
          >
            <MapPin size={14} className="text-red-500 drop-shadow-md" fill="#ef4444" />
          </div>
        </div>
      )}

      {/* Feature: uploaded thumbnail image */}
      {showImg && (
        <div className="w-full h-20 overflow-hidden rounded-t border-b border-[#30363d]">
          <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="p-3 pt-2">
        {/* Top row: type badge + label + edit button */}
        <div className="flex items-start gap-1.5 mb-1 min-w-0">
          {typeConfig && (
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-mono shrink-0 mt-0.5 ${typeConfig.color}`}>
              {typeConfig.icon}
              {typeConfig.label}
            </span>
          )}
          <span className="text-[13px] font-semibold text-[#e6edf3] leading-tight truncate flex-1 min-w-0">
            {node.label}
          </span>
          {onEdit && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-[#8b949e] hover:text-amber-400"
            >
              <Pencil size={10} />
            </button>
          )}
        </div>

        {node.summary && (
          <div className="text-[11px] text-[#8b949e] leading-tight line-clamp-2 mb-1.5">
            {node.summary}
          </div>
        )}

        {/* Top 3 key-value properties */}
        {previewProps.length > 0 && (
          <div className="space-y-0.5 mb-1.5 mt-1">
            {previewProps.map(([k, v]) => (
              <div key={k} className="flex gap-1.5 text-[9px] font-mono leading-tight">
                <span className="text-[#484f58] shrink-0 truncate max-w-16">{k}</span>
                <span className="text-[#6e7681] truncate">{v}</span>
              </div>
            ))}
          </div>
        )}

        {node.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {node.tags.slice(0, 3).map((tag: string) => (
              <span
                key={tag}
                className="text-[9px] px-1.5 py-0.5 rounded bg-[#21262d] text-[#8b949e] border border-[#2d333b]"
              >
                {tag}
              </span>
            ))}
            {node.tags.length > 3 && (
              <span className="text-[9px] text-[#484f58]">+{node.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Footer indicators */}
        {(hasNotes || hasDoc || hasAttachments || hasLocation) && (
          <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-[#21262d]">
            {hasNotes && (
              <span title="Has notes" className="text-[#484f58]">
                <FileText size={9} />
              </span>
            )}
            {hasDoc && (
              <span title="Has document" className="text-amber-400/60">
                <BookOpen size={9} />
              </span>
            )}
            {hasAttachments && (
              <span title={`${node.attachments!.length} attachment${node.attachments!.length > 1 ? 's' : ''}`} className="text-[#484f58]">
                <Paperclip size={9} />
              </span>
            )}
            {hasLocation && (
              <span title={node.location!.label ?? `${node.location!.lat.toFixed(3)}, ${node.location!.lng.toFixed(3)}`} className="text-[#484f58]">
                <MapPin size={9} />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

NodeCard.displayName = 'NodeCard';
