import { useEffect, useState } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { X, BookOpen, Loader2 } from 'lucide-react';
import { useGraphStore } from '../../store/graphStore';
import { contentMap, contentDirty, getCurrentFileBlob } from '../../hooks/useAutoSave';
import { loadNodeContent } from '../../file/tnoteReader';

// ── Inner editor — rendered only once content is ready ────────────────────────

interface EditorInnerProps {
  nodeId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialContent: any[] | undefined;
}

function EditorInner({ nodeId, initialContent }: EditorInnerProps) {
  const updateNode = useGraphStore((s) => s.updateNode);
  const editor = useCreateBlockNote({
    initialContent: initialContent?.length ? initialContent : undefined,
  });

  // Persist content to contentMap on every change so auto-save can pick it up
  useEffect(() => {
    const unsubscribe = editor.onChange(() => {
      contentMap.set(nodeId, editor.document);
      contentDirty.add(nodeId);
      updateNode(nodeId, { hasContent: true });
    });
    return unsubscribe;
  }, [editor, nodeId, updateNode]);

  return (
    <BlockNoteView
      editor={editor}
      theme="dark"
      style={{ minHeight: '100%' }}
    />
  );
}

// ── Container — handles async content loading ─────────────────────────────────

interface Props {
  nodeId: string;
  onClose: () => void;
}

export function ContentEditor({ nodeId, onClose }: Props) {
  const node = useGraphStore((s) => s.nodes[nodeId]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [initialContent, setInitialContent] = useState<any[] | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Already in memory (edited this session)?
    const cached = contentMap.get(nodeId);
    if (cached) {
      setInitialContent(cached as any[]);
      setLoaded(true);
      return;
    }
    // Stored in the ZIP from a previous session?
    if (node?.hasContent) {
      const blob = getCurrentFileBlob();
      if (blob) {
        loadNodeContent(blob, nodeId)
          .then((doc) => {
            if (Array.isArray(doc) && doc.length) {
              contentMap.set(nodeId, doc);
              setInitialContent(doc as any[]);
            }
          })
          .catch(() => {/* start fresh */})
          .finally(() => setLoaded(true));
        return;
      }
    }
    setLoaded(true);
  }, [nodeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dismiss on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-[#0d1117] flex flex-col z-50">
      {/* Header */}
      <div className="h-10 bg-[#161b22] border-b border-[#30363d] flex items-center px-4 gap-3 shrink-0">
        <BookOpen size={14} className="text-amber-400" />
        <span className="text-sm font-medium text-[#e6edf3] truncate">{node?.label}</span>
        <span className="text-[11px] text-[#484f58] font-mono">· document</span>
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="text-[#8b949e] hover:text-[#e6edf3] transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* Editor area */}
      {!loaded ? (
        <div className="flex-1 flex items-center justify-center gap-2 text-[#484f58]">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto py-10 px-4">
            <EditorInner nodeId={nodeId} initialContent={initialContent} />
          </div>
        </div>
      )}
    </div>
  );
}
