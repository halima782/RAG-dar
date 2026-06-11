function getDocumentUrl(citation) {
  const docUrl = citation.url || `/api/documents/${citation.source}`;
  return docUrl.startsWith("http") ? docUrl : `${window.location.origin}${docUrl}`;
}

function buildMetadataSummary(citations) {
  const documents = new Set();
  const pages = new Set();

  citations.forEach((cite) => {
    if (cite.source) documents.add(cite.source);
    if (cite.page) pages.add(cite.page);
  });

  return {
    documentCount: documents.size,
    sourceCount: citations.length,
    pages: [...pages].sort((a, b) => a - b),
    documents: [...documents],
  };
}

function MetadataRow({ label, value }) {
  if (!value) return null;

  return (
    <div className="flex flex-col sm:flex-row gap-0.5 sm:gap-2 text-[11px]">
      <span className="shrink-0 sm:w-20 text-gray-400 font-medium">{label}</span>
      <span className="text-gray-700 break-all min-w-0">{value}</span>
    </div>
  );
}

export default function SourcesPanel({
  citations,
  highlightId,
  isOpen,
  onToggle,
  onSourceClick,
}) {
  if (!citations?.length) return null;

  const summary = buildMetadataSummary(citations);
  const panelId = `sources-panel-${citations[0]?.id ?? "default"}`;

  return (
    <div className="mt-2 border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        id={`${panelId}-toggle`}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="w-full flex items-center justify-between gap-2 sm:gap-3 px-2.5 sm:px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-50 text-blue-600 shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold text-gray-800">
              Sources &amp; metadata
            </span>
            <span className="block text-[10px] text-gray-500 line-clamp-2 sm:truncate">
              {summary.sourceCount} chunk{summary.sourceCount !== 1 ? "s" : ""} from{" "}
              {summary.documentCount} document{summary.documentCount !== 1 ? "s" : ""}
              {summary.pages.length > 0 && ` · Pages ${summary.pages.join(", ")}`}
            </span>
          </span>
        </span>
        <svg
          className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div id={panelId} className="border-t border-gray-100" role="region" aria-labelledby={`${panelId}-toggle`}>
          <div className="px-3 py-2.5 bg-gray-50 border-b border-gray-100 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Retrieval summary
            </p>
            <MetadataRow label="Documents" value={summary.documents.join(", ")} />
            <MetadataRow
              label="Pages"
              value={summary.pages.length > 0 ? summary.pages.join(", ") : "Not specified"}
            />
            <MetadataRow label="Chunks" value={String(summary.sourceCount)} />
          </div>

          <div className="divide-y divide-gray-100">
            {citations.map((cite) => {
              const docUrl = getDocumentUrl(cite);

              return (
                <div
                  key={cite.id}
                  id={`source-${cite.id}`}
                  className={`px-3 py-3 transition-colors ${
                    highlightId === cite.id ? "bg-blue-50/70" : ""
                  }`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <span className="shrink-0 text-[10px] font-bold text-blue-600 bg-blue-100 border border-blue-200 rounded px-1.5 py-0.5">
                      [{cite.id}]
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-900">
                        {cite.title || cite.source}
                      </p>
                      <div className="mt-1 space-y-0.5">
                        <MetadataRow label="File" value={cite.source} />
                        {cite.page && <MetadataRow label="Page" value={String(cite.page)} />}
                        <MetadataRow label="URL" value={docUrl} />
                      </div>
                    </div>
                  </div>

                  <div className="ml-7">
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">
                      Source excerpt
                    </p>
                    <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-3 bg-gray-50 border border-gray-100 rounded-md p-2">
                      {cite.snippet || cite.text || "No excerpt available."}
                    </p>
                    <button
                      type="button"
                      onClick={() => onSourceClick?.(cite.id)}
                      className="mt-2 text-[11px] font-medium text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      View full source →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
