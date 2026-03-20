import { useEffect, useState } from 'react';
import JSZip from 'jszip';
import { Archive, X, ImageIcon, Lock, Trash2, BookOpen, Loader2, HardDrive, FileJson } from 'lucide-react';
import { useGraphStore } from '../../store/graphStore';
import { getCurrentFileBlob, assetMap, contentMap, contentDirty } from '../../hooks/useAutoSave';
import { invalidateAsset, getCachedAsset, cacheAsset } from '../../lib/assetCache';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function guessMime(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    pdf: 'application/pdf', txt: 'text/plain',
  };
  return map[ext] ?? 'application/octet-stream';
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface AssetEntry {
  id: string;          // assetId (filename without path)
  filename: string;    // original filename stored in assets/
  size: number;
  mimeType: string;
  isImage: boolean;
  referencedBy: string[];  // node labels that reference this asset
}

interface ContentEntry {
  nodeId: string;
  nodeLabel: string;
  size: number;
}

interface CoreEntry {
  name: string;
  size: number;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-[#21262d] sticky top-0 bg-[#161b22] z-10">
      <span className="text-[10px] uppercase tracking-wider text-[#8b949e] font-mono">{label}</span>
      <span className="text-[9px] text-[#484f58] font-mono">({count})</span>
    </div>
  );
}

function CoreFileRow({ entry }: { entry: CoreEntry }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#21262d]/50">
      <FileJson size={13} className="text-[#484f58] shrink-0" />
      <span className="text-[12px] text-[#8b949e] font-mono flex-1">{entry.name}</span>
      <span className="text-[10px] text-[#3a3f47] font-mono">{fmtBytes(entry.size)}</span>
      <span title="Read-only"><Lock size={10} className="text-[#3a3f47]" /></span>
    </div>
  );
}

function AssetRow({
  entry,
  onDelete,
}: {
  entry: AssetEntry;
  onDelete: (id: string) => void;
}) {
  const url = getCachedAsset(entry.id);

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#21262d]/50 group">
      {/* Preview */}
      <div className="w-8 h-8 rounded bg-[#21262d] shrink-0 overflow-hidden flex items-center justify-center">
        {entry.isImage && url ? (
          <img src={url} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon size={12} className="text-[#484f58]" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-[#e6edf3] font-mono truncate">{entry.filename}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[9px] text-[#484f58] font-mono">{fmtBytes(entry.size)}</span>
          <span className="text-[9px] text-[#3a3f47] font-mono">{entry.mimeType.split('/')[1]}</span>
        </div>
        {entry.referencedBy.length > 0 && (
          <div className="text-[9px] text-[#484f58] truncate mt-0.5">
            ↳ {entry.referencedBy.join(', ')}
          </div>
        )}
      </div>

      {/* Actions */}
      <button
        onClick={() => onDelete(entry.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-[#484f58] hover:text-red-400"
        title="Remove asset"
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
}

function ContentRow({
  entry,
  onOpen,
}: {
  entry: ContentEntry;
  onOpen: (nodeId: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#21262d]/50 group">
      <BookOpen size={13} className="text-amber-400/60 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[12px] text-[#e6edf3] truncate">{entry.nodeLabel}</div>
        <div className="text-[9px] text-[#484f58] font-mono mt-0.5">{fmtBytes(entry.size)}</div>
      </div>
      <button
        onClick={() => onOpen(entry.nodeId)}
        className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-amber-400 hover:bg-amber-400/10"
      >
        Open
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onOpenEditor: (nodeId: string) => void;
}

export function FileExplorer({ onClose, onOpenEditor }: Props) {
  const nodes = useGraphStore((s) => s.nodes);
  const updateNode = useGraphStore((s) => s.updateNode);

  const [loading, setLoading] = useState(true);
  const [coreFiles, setCoreFiles] = useState<CoreEntry[]>([]);
  const [assetEntries, setAssetEntries] = useState<AssetEntry[]>([]);
  const [contentEntries, setContentEntries] = useState<ContentEntry[]>([]);
  const [totalSize, setTotalSize] = useState(0);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // Build node thumbnail reverse-index: assetId → [nodeLabel, ...]
  const thumbnailIndex = Object.values(nodes).reduce<Record<string, string[]>>((acc, n) => {
    if (n.thumbnail) {
      acc[n.thumbnail] = [...(acc[n.thumbnail] ?? []), n.label];
    }
    (n.attachments ?? []).forEach((a) => {
      acc[a.id] = [...(acc[a.id] ?? []), n.label];
    });
    return acc;
  }, {});

  useEffect(() => {
    const blob = getCurrentFileBlob();
    if (!blob) { setLoading(false); return; }

    void (async () => {
      try {
        const zip = await JSZip.loadAsync(blob);
        const core: CoreEntry[] = [];
        const assets: AssetEntry[] = [];
        const content: ContentEntry[] = [];
        let total = 0;

        for (const [path, file] of Object.entries(zip.files)) {
          if (file.dir) continue;
          const data = await file.async('uint8array');
          const size = data.length;
          total += size;

          if (!path.includes('/')) {
            // Core file
            core.push({ name: path, size });
          } else if (path.startsWith('assets/')) {
            const filename = path.replace('assets/', '');
            const assetId = filename; // stored as-is
            const mimeType = guessMime(filename);
            const isImage = mimeType.startsWith('image/');

            // Ensure it's cached for preview
            if (isImage && !getCachedAsset(assetId)) {
              cacheAsset(assetId, data.buffer as ArrayBuffer, mimeType);
            }

            assets.push({
              id: assetId,
              filename,
              size,
              mimeType,
              isImage,
              referencedBy: thumbnailIndex[assetId] ?? [],
            });
          } else if (path.startsWith('content/')) {
            const nodeId = path.replace('content/', '').replace('.json', '');
            const nodeLabel = nodes[nodeId]?.label ?? nodeId;
            content.push({ nodeId, nodeLabel, size });
          }
        }

        setCoreFiles(core.sort((a, b) => a.name.localeCompare(b.name)));
        setAssetEntries(assets.sort((a, b) => b.size - a.size));
        setContentEntries(content.sort((a, b) => a.nodeLabel.localeCompare(b.nodeLabel)));
        setTotalSize(total);
      } catch (err) {
        console.error('FileExplorer: failed to read archive', err);
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeleteAsset = (assetId: string) => {
    // Remove from in-memory maps
    assetMap.delete(assetId);
    invalidateAsset(assetId);

    // Remove reference from any node that uses it as thumbnail
    Object.values(nodes).forEach((n) => {
      if (n.thumbnail === assetId) {
        updateNode(n.id, { thumbnail: undefined });
      }
      if (n.attachments?.some((a) => a.id === assetId)) {
        updateNode(n.id, { attachments: n.attachments.filter((a) => a.id !== assetId) });
      }
    });

    // Remove from content tracking if somehow mixed in
    contentMap.delete(assetId);
    contentDirty.delete(assetId);

    setAssetEntries((prev) => prev.filter((e) => e.id !== assetId));
  };

  const handleOpenContent = (nodeId: string) => {
    onClose();
    onOpenEditor(nodeId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-140 max-h-[80vh] bg-[#161b22] rounded border border-[#30363d] flex flex-col overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="h-10 bg-[#0d1117] border-b border-[#30363d] flex items-center px-4 gap-3 shrink-0">
          <Archive size={13} className="text-amber-400" />
          <span className="text-sm font-medium text-[#e6edf3]">Archive Browser</span>
          <span className="text-[10px] text-[#484f58] font-mono">.tnote</span>
          <div className="flex-1" />
          {!loading && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#484f58]">
              <HardDrive size={10} />
              {fmtBytes(totalSize)} total
            </div>
          )}
          <button
            onClick={onClose}
            className="ml-2 text-[#8b949e] hover:text-[#e6edf3] transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center gap-2 text-[#484f58]">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Reading archive…</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">

            {/* Core files */}
            <SectionHeader label="Case Files" count={coreFiles.length} />
            {coreFiles.map((e) => <CoreFileRow key={e.name} entry={e} />)}

            {/* Assets */}
            <SectionHeader label="Assets" count={assetEntries.length} />
            {assetEntries.length === 0 ? (
              <div className="px-4 py-3 text-[11px] text-[#3a3f47]">No assets attached yet</div>
            ) : (
              assetEntries.map((e) => (
                <AssetRow key={e.id} entry={e} onDelete={handleDeleteAsset} />
              ))
            )}

            {/* Content documents */}
            <SectionHeader label="Documents" count={contentEntries.length} />
            {contentEntries.length === 0 ? (
              <div className="px-4 py-3 text-[11px] text-[#3a3f47]">No documents created yet</div>
            ) : (
              contentEntries.map((e) => (
                <ContentRow key={e.nodeId} entry={e} onOpen={handleOpenContent} />
              ))
            )}

            <div className="h-4" />
          </div>
        )}
      </div>
    </div>
  );
}
