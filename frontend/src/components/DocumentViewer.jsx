import { useMemo, useRef } from "react";
import { APP_NAME } from "../constants/branding";
import { getDocumentPdfPath } from "../utils/documentUrls";

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

export default function DocumentViewer({ file, page }) {
  const iframeRef = useRef(null);

  const citation = useMemo(
    () => ({
      source: file,
      page: page ? Number(page) : null,
    }),
    [file, page]
  );

  const pdfPath = getDocumentPdfPath(citation);

  const handlePrint = () => {
    const frame = iframeRef.current;
    if (!frame?.contentWindow) return;
    frame.contentWindow.focus();
    frame.contentWindow.print();
  };

  if (!file || !pdfPath) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-600">
        Document not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      <header className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white border-b border-slate-200 shadow-sm">
        <div className="min-w-0">
          <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide">{APP_NAME}</p>
          <h1 className="text-sm sm:text-base font-semibold text-slate-900 truncate">{file}</h1>
          {page && <p className="text-xs text-slate-500 mt-0.5">Opened at page {page}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            <PrintIcon />
            Print
          </button>
          <button
            type="button"
            onClick={() => window.close()}
            className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </header>

      <iframe
        ref={iframeRef}
        title={`${file}${page ? ` - page ${page}` : ""}`}
        src={pdfPath}
        className="flex-1 w-full min-h-0 border-0 bg-slate-800"
      />
    </div>
  );
}
