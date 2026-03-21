import { useState, useRef } from 'react';
import { X, Plus, Trash2, Paperclip, FileText, ImagePlus, BookOpen, MapPin, Image } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useGraphStore } from '../../store/graphStore';
import { getAllTags } from '../../graph/graphOps';
import { assetMap } from '../../hooks/useAutoSave';
import { cacheAsset, getCachedAsset } from '../../lib/assetCache';
import { NODE_TYPE_CONFIG, ALL_NODE_TYPES } from '../../lib/nodeTypeConfig';
import { LocationPickerDialog } from '../dialogs/LocationPickerDialog';
import type { NodeAttachment } from '../../types';

interface Props {
  nodeId: string;
  onClose: () => void;
  onOpenEditor: (nodeId: string) => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-wider text-[#8b949e] mb-1.5 font-mono">{children}</div>
  );
}

export function NodePanel({ nodeId, onClose, onOpenEditor }: Props) {
  const node = useGraphStore((s) => s.nodes[nodeId]);
  const updateNode = useGraphStore((s) => s.updateNode);
  const deleteNode = useGraphStore((s) => s.deleteNode);
  const allNodes = useGraphStore((s) => s.nodes);

  const [newTag, setNewTag] = useState('');
  const [newPropKey, setNewPropKey] = useState('');
  const [newPropVal, setNewPropVal] = useState('');
  const [imgDragOver, setImgDragOver] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);

  if (!node) return null;

  const allTags = getAllTags(allNodes);
  const thumbnailUrl = node.thumbnail ? getCachedAsset(node.thumbnail) : undefined;

  // ── Image upload ──────────────────────────────────────────────────────────

  const uploadThumbnail = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const ext = file.name.split('.').pop() ?? 'jpg';
    const assetId = `${nanoid()}.${ext}`;
    const buffer = await file.arrayBuffer();
    assetMap.set(assetId, buffer);
    cacheAsset(assetId, buffer, file.type);
    updateNode(nodeId, { thumbnail: assetId });
  };

  // ── File attachment upload ─────────────────────────────────────────────────

  const uploadAttachment = async (file: File) => {
    const ext = file.name.split('.').pop() ?? 'bin';
    const assetId = `${nanoid()}.${ext}`;
    const buffer = await file.arrayBuffer();
    assetMap.set(assetId, buffer);
    if (file.type.startsWith('image/')) cacheAsset(assetId, buffer, file.type);
    const attachment: NodeAttachment = { id: assetId, filename: file.name, size: file.size, mimeType: file.type };
    updateNode(nodeId, { attachments: [...(node.attachments ?? []), attachment] });
  };

  const removeAttachment = (id: string) => {
    updateNode(nodeId, { attachments: (node.attachments ?? []).filter((a) => a.id !== id) });
  };

  const downloadAttachment = (att: NodeAttachment) => {
    const buffer = assetMap.get(att.id);
    if (!buffer) return;
    const url = URL.createObjectURL(new Blob([buffer], { type: att.mimeType }));
    const a = document.createElement('a');
    a.href = url; a.download = att.filename; a.click();
    URL.revokeObjectURL(url);
  };

  const formatSize = (b: number) =>
    b < 1024 ? `${b}B` : b < 1048576 ? `${(b / 1024).toFixed(1)}KB` : `${(b / 1048576).toFixed(1)}MB`;

  return (
    <div className="w-80 h-full bg-[#161b22] border-l border-[#30363d] flex flex-col overflow-hidden shrink-0">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#30363d] shrink-0">
        <span className="text-[10px] uppercase tracking-wider text-[#8b949e] font-mono">Node</span>
        <button onClick={onClose} className="text-[#8b949e] hover:text-[#e6edf3]"><X size={14} /></button>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* Thumbnail */}
        <div className="border-b border-[#21262d]">
          {thumbnailUrl ? (
            <div className="relative group">
              <img src={thumbnailUrl} alt="" className="w-full h-36 object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button onClick={() => imgInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs bg-[#161b22] text-[#e6edf3] rounded border border-[#30363d] hover:border-amber-400/60">
                  Replace
                </button>
                <button onClick={() => updateNode(nodeId, { thumbnail: undefined })}
                  className="px-3 py-1.5 text-xs bg-[#161b22] text-red-400 rounded border border-red-400/30 hover:border-red-400/60">
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setImgDragOver(true); }}
              onDragLeave={() => setImgDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setImgDragOver(false); const f = e.dataTransfer.files[0]; if (f) void uploadThumbnail(f); }}
              onClick={() => imgInputRef.current?.click()}
              className={[
                'flex flex-col items-center gap-1.5 py-5 mx-4 my-3 rounded border border-dashed cursor-pointer transition-colors',
                imgDragOver ? 'border-amber-400/60 bg-amber-400/5 text-amber-400' : 'border-[#30363d] text-[#484f58] hover:border-[#484f58] hover:text-[#8b949e]',
              ].join(' ')}
            >
              <ImagePlus size={18} />
              <span className="text-[11px]">Drop image or click to upload</span>
            </div>
          )}
          <input ref={imgInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadThumbnail(f); }} />
        </div>

        <div className="p-4 space-y-4">

          {/* Node type — 13 types in a wrap grid */}
          <div>
            <SectionLabel>Type</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => updateNode(nodeId, { nodeType: undefined })}
                className={[
                  'px-2 py-0.5 rounded border text-[10px] transition-colors',
                  !node.nodeType ? 'border-[#484f58] text-[#e6edf3] bg-[#21262d]' : 'border-[#30363d] text-[#484f58] hover:border-[#484f58]',
                ].join(' ')}
              >
                None
              </button>
              {ALL_NODE_TYPES.map((type) => {
                const cfg = NODE_TYPE_CONFIG[type];
                return (
                  <button
                    key={type}
                    onClick={() => updateNode(nodeId, { nodeType: type })}
                    className={[
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] transition-colors',
                      node.nodeType === type ? cfg.color : 'border-[#30363d] text-[#484f58] hover:border-[#484f58] hover:text-[#8b949e]',
                    ].join(' ')}
                  >
                    {cfg.icon}
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Label */}
          <div>
            <SectionLabel>Label</SectionLabel>
            <input type="text" value={node.label}
              onChange={(e) => updateNode(nodeId, { label: e.target.value })}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-[#e6edf3] text-sm focus:outline-none focus:border-amber-400/60"
            />
          </div>

          {/* Summary */}
          <div>
            <SectionLabel>Summary</SectionLabel>
            <textarea value={node.summary ?? ''} rows={2}
              onChange={(e) => updateNode(nodeId, { summary: e.target.value })}
              placeholder="Brief one-liner…"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-[#e6edf3] text-sm placeholder-[#3a3f47] focus:outline-none focus:border-amber-400/60 resize-none"
            />
          </div>

          {/* Quick notes */}
          <div>
            <SectionLabel>Quick Notes</SectionLabel>
            <textarea value={node.notes ?? ''} rows={4}
              onChange={(e) => updateNode(nodeId, { notes: e.target.value })}
              placeholder="Rapid observations, source URLs, short intel…"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-[#e6edf3] text-[12px] leading-relaxed placeholder-[#3a3f47] focus:outline-none focus:border-amber-400/60 resize-y font-mono"
            />
          </div>

          {/* Document editor */}
          <div>
            <SectionLabel>Document</SectionLabel>
            <button
              onClick={() => onOpenEditor(nodeId)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded border border-[#30363d] hover:border-amber-400/40 hover:bg-amber-400/5 transition-colors group text-left"
            >
              <BookOpen size={14} className={node.hasContent ? 'text-amber-400' : 'text-[#484f58] group-hover:text-amber-400'} />
              <div>
                <div className={`text-[12px] font-medium ${node.hasContent ? 'text-amber-400' : 'text-[#8b949e] group-hover:text-[#e6edf3]'}`}>
                  {node.hasContent ? 'Open document' : 'Create document'}
                </div>
                <div className="text-[10px] text-[#484f58]">
                  {node.hasContent ? 'Block-based rich text editor' : 'Headings, lists, tables, images…'}
                </div>
              </div>
            </button>
          </div>

          {/* Location */}
          <div>
            <SectionLabel>Location</SectionLabel>
            {node.location ? (
              <div className="space-y-2">
                <div className="flex items-start gap-2 px-2 py-2 rounded bg-[#0d1117] border border-[#30363d]">
                  <MapPin size={12} className="text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    {node.location.label && (
                      <div className="text-[11px] text-[#e6edf3] leading-tight mb-0.5 truncate">{node.location.label}</div>
                    )}
                    <div className="text-[10px] font-mono text-[#6e7681]">
                      {node.location.lat.toFixed(5)}, {node.location.lng.toFixed(5)}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowLocationPicker(true)}
                    className="text-[10px] text-[#8b949e] hover:text-amber-400 transition-colors shrink-0"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => updateNode(nodeId, { location: undefined, featureDisplay: undefined })}
                    className="text-[#484f58] hover:text-red-400 transition-colors shrink-0"
                  >
                    <X size={10} />
                  </button>
                </div>

                {/* Feature selector — only when both image and location exist */}
                {node.thumbnail && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#484f58] mb-1 font-mono">Card Feature</div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => updateNode(nodeId, { featureDisplay: 'image' })}
                        className={[
                          'flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] transition-colors',
                          (node.featureDisplay ?? 'image') === 'image'
                            ? 'border-amber-400/60 text-amber-400 bg-amber-400/10'
                            : 'border-[#30363d] text-[#484f58] hover:border-[#484f58]',
                        ].join(' ')}
                      >
                        <Image size={10} /> Image
                      </button>
                      <button
                        onClick={() => updateNode(nodeId, { featureDisplay: 'map' })}
                        className={[
                          'flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] transition-colors',
                          node.featureDisplay === 'map'
                            ? 'border-amber-400/60 text-amber-400 bg-amber-400/10'
                            : 'border-[#30363d] text-[#484f58] hover:border-[#484f58]',
                        ].join(' ')}
                      >
                        <MapPin size={10} /> Map
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowLocationPicker(true)}
                className="flex items-center gap-2 text-[11px] text-[#484f58] hover:text-amber-400 transition-colors"
              >
                <MapPin size={11} /> Add location pin
              </button>
            )}
          </div>

          {/* Tags */}
          <div>
            <SectionLabel>Tags</SectionLabel>
            <div className="flex flex-wrap gap-1 mb-2">
              {node.tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-[#21262d] text-[#8b949e] border border-[#30363d]">
                  {tag}
                  <button onClick={() => updateNode(nodeId, { tags: node.tags.filter((t) => t !== tag) })}
                    className="hover:text-red-400 transition-colors"><X size={9} /></button>
                </span>
              ))}
            </div>
            <input type="text" value={newTag} list="tag-suggestions" placeholder="Add tag and press Enter…"
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTag.trim()) {
                  if (!node.tags.includes(newTag.trim())) updateNode(nodeId, { tags: [...node.tags, newTag.trim()] });
                  setNewTag('');
                }
              }}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-[#e6edf3] text-xs placeholder-[#3a3f47] focus:outline-none focus:border-amber-400/60"
            />
            <datalist id="tag-suggestions">
              {allTags.filter((t) => !node.tags.includes(t)).map((t) => <option key={t} value={t} />)}
            </datalist>
          </div>

          {/* Properties */}
          <div>
            <SectionLabel>Properties</SectionLabel>
            <div className="space-y-1.5">
              {Object.entries(node.properties).map(([k, v]) => (
                <div key={k} className="flex gap-1.5 items-center">
                  <input type="text" value={k}
                    onChange={(e) => {
                      const props = { ...node.properties }; delete props[k]; props[e.target.value] = v;
                      updateNode(nodeId, { properties: props });
                    }}
                    className="w-24 bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-[10px] text-[#8b949e] focus:outline-none focus:border-amber-400/60 font-mono"
                  />
                  <input type="text" value={v}
                    onChange={(e) => updateNode(nodeId, { properties: { ...node.properties, [k]: e.target.value } })}
                    className="flex-1 bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-[11px] text-[#e6edf3] focus:outline-none focus:border-amber-400/60"
                  />
                  <button onClick={() => { const p = { ...node.properties }; delete p[k]; updateNode(nodeId, { properties: p }); }}
                    className="text-[#484f58] hover:text-red-400 transition-colors">
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-1.5 mt-2">
              <input type="text" value={newPropKey} placeholder="key"
                onChange={(e) => setNewPropKey(e.target.value)}
                className="w-24 bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-[10px] text-[#8b949e] placeholder-[#3a3f47] focus:outline-none focus:border-amber-400/60 font-mono"
              />
              <input type="text" value={newPropVal} placeholder="value"
                onChange={(e) => setNewPropVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newPropKey.trim()) {
                    updateNode(nodeId, { properties: { ...node.properties, [newPropKey.trim()]: newPropVal.trim() } });
                    setNewPropKey(''); setNewPropVal('');
                  }
                }}
                className="flex-1 bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-[11px] text-[#e6edf3] placeholder-[#3a3f47] focus:outline-none focus:border-amber-400/60"
              />
              <button onClick={() => {
                if (newPropKey.trim()) {
                  updateNode(nodeId, { properties: { ...node.properties, [newPropKey.trim()]: newPropVal.trim() } });
                  setNewPropKey(''); setNewPropVal('');
                }
              }} className="text-amber-400 hover:text-amber-300"><Plus size={14} /></button>
            </div>
          </div>

          {/* Attachments */}
          <div>
            <SectionLabel>Attachments</SectionLabel>
            {(node.attachments ?? []).length === 0 ? (
              <div className="text-[11px] text-[#3a3f47] mb-2">No files attached</div>
            ) : (
              <div className="space-y-1 mb-2">
                {(node.attachments ?? []).map((att) => (
                  <div key={att.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-[#0d1117] border border-[#30363d] group">
                    <FileText size={10} className="text-[#484f58] shrink-0" />
                    <button onClick={() => downloadAttachment(att)}
                      className="flex-1 text-left text-[11px] text-[#8b949e] hover:text-[#e6edf3] truncate transition-colors">
                      {att.filename}
                    </button>
                    <span className="text-[10px] text-[#3a3f47] font-mono shrink-0">{formatSize(att.size)}</span>
                    <button onClick={() => removeAttachment(att.id)}
                      className="text-[#484f58] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => attachInputRef.current?.click()}
              className="flex items-center gap-2 text-[11px] text-[#484f58] hover:text-amber-400 transition-colors">
              <Paperclip size={11} />Attach file
            </button>
            <input ref={attachInputRef} type="file" className="hidden" multiple
              onChange={(e) => { Array.from(e.target.files ?? []).forEach((f) => void uploadAttachment(f)); e.target.value = ''; }} />
          </div>

          {/* Timestamps */}
          <div className="text-[10px] text-[#3a3f47] font-mono space-y-0.5 pb-2">
            <div>created {new Date(node.createdAt).toLocaleString()}</div>
            <div>updated {new Date(node.updatedAt).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Delete */}
      <div className="p-3 border-t border-[#30363d] shrink-0">
        <button onClick={() => { deleteNode(nodeId); onClose(); }}
          className="w-full py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors">
          Delete Node
        </button>
      </div>

      {showLocationPicker && (
        <LocationPickerDialog
          initial={node.location}
          onConfirm={(loc) => {
            updateNode(nodeId, { location: loc });
            setShowLocationPicker(false);
          }}
          onClose={() => setShowLocationPicker(false)}
        />
      )}
    </div>
  );
}
