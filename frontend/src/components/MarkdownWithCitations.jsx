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
    citations.forEach((c) => built.set(c.id, c));
    return built;
  }, [citationMap, citations]);

  return (
    <div className="markdown-body text-sm leading-relaxed">
      {segments.map((segment, index) => {
        if (segment.type === "citation") {
          return (
            <CitationBadge
              key={`cite-${index}`}
              id={segment.id}
              citation={map.get(segment.id)}
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
      {isStreaming && (
        <span className="inline-block w-2 h-4 ml-0.5 bg-gray-500 animate-pulse align-middle" />
      )}
    </div>
  );
}
