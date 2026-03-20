import { type EdgeProps, BaseEdge, getStraightPath, EdgeLabelRenderer } from '@xyflow/react';
import { Edit2 } from 'lucide-react';

export interface EdgeLineData extends Record<string, unknown> {
  label?: string;
  onEdit?: () => void;
}

export function EdgeLine({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected,
  markerEnd,
}: EdgeProps) {
  const edgeData = data as EdgeLineData | undefined;
  const [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  const hasLabel = Boolean(edgeData?.label);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          strokeDasharray: hasLabel ? undefined : '6,4',
          stroke: selected ? '#f87171' : '#dc2626',
          strokeWidth: 1.5,
          opacity: selected ? 1 : 0.65,
        }}
      />
      {hasLabel && (
        <EdgeLabelRenderer>
          <div
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}
            className="absolute pointer-events-auto nodrag nopan"
          >
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#161b22] border border-[#30363d] text-[10px] text-[#e6edf3]">
              {edgeData?.label}
              {edgeData?.onEdit && (
                <button
                  onClick={edgeData.onEdit}
                  className="text-[#8b949e] hover:text-red-400 transition-colors"
                >
                  <Edit2 size={9} />
                </button>
              )}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
