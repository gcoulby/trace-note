import { useMemo, useState } from 'react';
import { useGraphStore } from '../store/graphStore';

export function useSearch() {
  const nodes = useGraphStore((s) => s.nodes);
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return Object.values(nodes).filter((n) => {
      if (n.label.toLowerCase().includes(q)) return true;
      if (n.summary?.toLowerCase().includes(q)) return true;
      if (n.tags.some((t) => t.toLowerCase().includes(q))) return true;
      if (Object.entries(n.properties).some(([k, v]) =>
        k.toLowerCase().includes(q) || v.toLowerCase().includes(q)
      )) return true;
      return false;
    });
  }, [nodes, query]);

  return { query, setQuery, results };
}
