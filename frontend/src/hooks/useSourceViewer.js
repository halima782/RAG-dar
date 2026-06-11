import { useMemo, useState } from "react";

export function useSourceViewer(citations = []) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [highlightId, setHighlightId] = useState(null);
  const [viewingCitation, setViewingCitation] = useState(null);

  const citationMap = useMemo(() => {
    const map = new Map();
    citations.forEach((c) => {
      map.set(c.id, c);
      map.set(Number(c.id), c);
    });
    return map;
  }, [citations]);

  const openSource = (id) => {
    const citation = citationMap.get(id);
    if (!citation) return;

    setHighlightId(id);
    setSourcesOpen(true);
    setViewingCitation(citation);

    requestAnimationFrame(() => {
      document.getElementById(`source-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const toggleSources = () => setSourcesOpen((open) => !open);

  return {
    sourcesOpen,
    highlightId,
    viewingCitation,
    citationMap,
    openSource,
    toggleSources,
    closeModal: () => setViewingCitation(null),
  };
}
