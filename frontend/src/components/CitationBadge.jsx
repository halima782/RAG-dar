import { useRef, useState } from "react";

function getPreviewText(citation) {
  if (!citation) return null;
  if (citation.snippet) return citation.snippet;
  if (citation.text) {
    return citation.text.length > 280
      ? `${citation.text.slice(0, 280)}...`
      : citation.text;
  }
  return null;
}

export default function CitationBadge({ id, citation, onClick }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const badgeRef = useRef(null);
  const preview = getPreviewText(citation);

  const updatePosition = () => {
    const rect = badgeRef.current?.getBoundingClientRect();
    if (!rect) return;

    setTooltipPos({
      top: rect.top - 8,
      left: rect.left + rect.width / 2,
    });
  };

  const handleMouseEnter = () => {
    if (!preview) return;
    updatePosition();
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const handleClick = () => {
    setShowTooltip(false);
    onClick?.(id);
  };

  return (
    <>
      <span
        ref={badgeRef}
        className="relative inline-block align-super"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button
          type="button"
          onClick={handleClick}
          className="mx-0.5 text-[10px] font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 border border-blue-200 rounded px-1 py-px leading-none transition-colors cursor-pointer"
          aria-label={`Citation ${id}, hover for preview`}
        >
          [{id}]
        </button>
      </span>

      {showTooltip && preview && (
        <div
          className="fixed z-[100] w-[min(18rem,calc(100vw-1.5rem))] max-w-72 -translate-x-1/2 -translate-y-full pointer-events-none px-1"
          style={{
            top: tooltipPos.top,
            left: Math.min(
              Math.max(tooltipPos.left, 24),
              window.innerWidth - 24
            ),
          }}
          role="tooltip"
        >
          <div className="bg-gray-900 text-white text-xs rounded-lg shadow-xl p-3 border border-gray-700">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
              Source preview
            </p>
            <p className="font-semibold text-blue-200 mb-2">
              {citation.title || citation.source}
              {citation.page ? ` · Page ${citation.page}` : ""}
            </p>
            <p className="text-gray-300 leading-relaxed text-[11px] line-clamp-5">
              "{preview}"
            </p>
            <p className="text-blue-300 text-[10px] mt-2 pt-2 border-t border-gray-700">
              Click to view full source
            </p>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2.5 h-2.5 bg-gray-900 border-r border-b border-gray-700 rotate-45" />
        </div>
      )}
    </>
  );
}
