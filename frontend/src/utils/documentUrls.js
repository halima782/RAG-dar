function parseCitationUrl(citation) {
  const raw = citation?.url || "";
  if (!raw.includes("#page=")) {
    return { page: citation?.page ?? null };
  }

  const match = raw.match(/#page=(\d+)/);
  return {
    page: match ? Number(match[1]) : citation?.page ?? null,
  };
}

export function getCitationPage(citation) {
  if (!citation) return null;
  if (citation.page) return Number(citation.page);
  return parseCitationUrl(citation).page;
}

export function getDocumentPdfPath(citation) {
  const source = citation?.source;
  if (!source) return null;

  const encodedSource = encodeURIComponent(source);
  const page = getCitationPage(citation);
  const hash = page ? `#page=${page}` : "";
  return `/api/documents/${encodedSource}${hash}`;
}

export function getDocumentPdfUrl(citation) {
  const path = getDocumentPdfPath(citation);
  if (!path) return null;
  return `${window.location.origin}${path}`;
}

export function getDocumentViewerUrl(citation) {
  const source = citation?.source;
  if (!source) return null;

  const url = new URL(window.location.origin);
  url.searchParams.set("viewer", "1");
  url.searchParams.set("file", source);

  const page = getCitationPage(citation);
  if (page) {
    url.searchParams.set("page", String(page));
  }

  return url.toString();
}

export function openDocumentViewer(citation) {
  const url = getDocumentViewerUrl(citation);
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function printDocument(citation) {
  const pdfUrl = getDocumentPdfUrl(citation);
  if (!pdfUrl) return;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.src = pdfUrl;

  const cleanup = () => {
    window.setTimeout(() => iframe.remove(), 1000);
  };

  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      cleanup();
    }
  };

  document.body.appendChild(iframe);
}
