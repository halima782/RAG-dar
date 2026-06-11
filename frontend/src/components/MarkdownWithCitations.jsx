import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import CitationBadge from "./CitationBadge";
import { parseContentSegments, stripSourcesFooter } from "../utils/citations";

export default function MarkdownWithCitations({
  text,
  citations = [],
  citationMap,
  isStreaming,
  onCitationClick,
}) {
  const cleanText = useMemo(() => stripSourcesFooter(text), [text]);
  const segments = useMemo(() => parseContentSegments(cleanText), [cleanText]);

  const map = useMemo(() => {
    if (citationMap) return citationMap;
    const built = new Map();
    citations.forEach((c) => {
      built.set(c.id, c);
      built.set(Number(c.id), c);
    });
    return built;
  }, [citationMap, citations]);

  const hasInlineCitations = segments.some((segment) => segment.type === "citation");

  const resolveCitation = (citeId) => map.get(citeId) ?? map.get(Number(citeId));

  return (
    <div className="markdown-body text-sm leading-relaxed w-fit max-w-full">
      {segments.map((segment, index) => {
        if (segment.type === "citation") {
          return (
            <CitationBadge
              key={`cite-${index}`}
              id={segment.id}
              citation={resolveCitation(segment.id)}
              onClick={onCitationClick}
            />
          );
        }

        if (!segment.content) return null;

        return (
          <span key={`text-${index}`} className="inline">
            <ReactMarkdown
              components={{
                p: ({ children }) => <span className="block my-1">{children}</span>,
              }}
            >
              {segment.content}
            </ReactMarkdown>
          </span>
        );
      })}
      {!hasInlineCitations && citations.length > 0 && !isStreaming && (
        <span className="inline-flex flex-wrap items-center gap-0.5 ml-1 align-middle">
          {citations.map((citation) => (
            <CitationBadge
              key={`cite-fallback-${citation.id}`}
              id={citation.id}
              citation={resolveCitation(citation.id)}
              onClick={onCitationClick}
            />
          ))}
        </span>
      )}
      {isStreaming && (
        <span className="inline-block w-2 h-4 ml-0.5 bg-indigo-500 animate-pulse align-middle rounded-sm" />
      )}
    </div>
  );
}
