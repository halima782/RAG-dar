import {
  getDocumentViewerUrl,
  openDocumentViewer,
  printDocument,
} from "../utils/documentUrls";

function PrintIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
      />
    </svg>
  );
}

export default function SourceViewerModal({ citation, onClose }) {
  if (!citation) return null;

  const title = citation.title || citation.source;
  const viewerUrl = getDocumentViewerUrl(citation);

  const handleOpenDocument = (event) => {
    event.preventDefault();
    openDocumentViewer(citation);
  };

  const handlePrint = () => {
    printDocument(citation);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Source document viewer"
    >
      <div className="absolute inset-0 bg-gray-900/30" onClick={onClose} />

      <div className="relative w-full max-w-lg max-h-[min(90dvh,720px)] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
          <div className="min-w-0 pr-4">
            <p className="text-xs font-medium text-blue-600 mb-1">Source [{citation.id}]</p>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            {citation.page && (
              <p className="text-sm text-gray-500 mt-0.5">Page {citation.page}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 sm:px-5 py-4 space-y-4 overflow-y-auto min-h-0 flex-1">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Document URL
            </p>
            <a
              href={viewerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline break-all"
            >
              {viewerUrl}
            </a>
            <p className="text-[11px] text-gray-400 mt-1.5">
              Opens the PDF at page {citation.page || "1"} in a new tab.
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Retrieved text chunk
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {citation.text || citation.snippet || "No source text available."}
              </p>
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              This chunk was retrieved from the vector database (Weaviate) to support the AI answer.
            </p>
          </div>
        </div>

        <div className="px-4 sm:px-5 py-3 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row gap-2 shrink-0">
          <button
            type="button"
            onClick={handleOpenDocument}
            className="flex-1 py-2 text-sm font-medium text-center text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            Open document
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <PrintIcon />
            Print
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
