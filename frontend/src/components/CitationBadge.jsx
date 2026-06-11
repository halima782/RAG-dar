import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

function getPreviewText(citation) {
  if (!citation) return null;
  if (citation.snippet) return citation.snippet;
  if (citation.text) {
    return citation.text.length > 280
      ? `${citation.text.slice(0, 280)}...`
      : citation.text;
  }
  if (citation.source) {
    return `Excerpt from ${citation.source}${citation.page ? `, page ${citation.page}` : ""}.`;
  }
  return null;
}

export default function CitationBadge({ id, citation, onClick }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const badgeRef = useRef(null);
  const showTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const tooltipId = useId();
  const preview = getPreviewText(citation);

  const clearTimers = () => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const updatePosition = useCallback(() => {
    const rect = badgeRef.current?.getBoundingClientRect();
    if (!rect) return;

    setTooltipPos({
      top: rect.bottom + 8,
      left: rect.left + rect.width / 2,
    });
  }, []);

  const openTooltip = () => {
    clearTimers();
    updatePosition();
    setShowTooltip(true);
  };

  const scheduleOpen = () => {
    clearTimers();
    showTimerRef.current = setTimeout(openTooltip, 120);
  };

  const scheduleClose = () => {
    clearTimers();
    hideTimerRef.current = setTimeout(() => setShowTooltip(false), 180);
  };

  const cancelClose = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!showTooltip) return undefined;

    updatePosition();

    const handleReposition = () => updatePosition();
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);

    return () => {
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [showTooltip, updatePosition]);

  useEffect(() => () => clearTimers(), []);

  const handleClick = () => {
    setShowTooltip(false);
    onClick?.(id);
  };

  const tooltip =
    showTooltip && preview ? (
      <div
        id={tooltipId}
        role="tooltip"
        className="fixed z-[200] w-[min(18rem,calc(100vw-1.5rem))] max-w-72 -translate-x-1/2 pointer-events-auto px-1"
        style={{
          top: tooltipPos.top,
          left: Math.min(Math.max(tooltipPos.left, 24), window.innerWidth - 24),
        }}
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
      >
        <div className="bg-slate-900 text-white text-xs rounded-xl shadow-2xl p-3 border border-slate-700/80">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
            Source preview
          </p>
          <p className="font-semibold text-indigo-300 mb-2">
            {citation?.title || citation?.source || `Source ${id}`}
            {citation?.page ? ` · Page ${citation.page}` : ""}
          </p>
          <p className="text-gray-300 leading-relaxed text-[11px] line-clamp-5">
            &ldquo;{preview}&rdquo;
          </p>
          <p className="text-blue-300 text-[10px] mt-2 pt-2 border-t border-gray-700">
            Click citation to view full source
          </p>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2.5 h-2.5 bg-slate-900 border-l border-t border-slate-700 rotate-45" />
      </div>
    ) : null;

  return (
    <>
      <span
        ref={badgeRef}
        className="relative inline-block align-super"
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
      >
        <button
          type="button"
          onClick={handleClick}
          onFocus={openTooltip}
          onBlur={scheduleClose}
          className="mx-0.5 text-[10px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-md px-1.5 py-0.5 leading-none transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
          aria-label={`Citation ${id}, hover for source preview`}
          aria-describedby={showTooltip ? tooltipId : undefined}
        >
          [{id}]
        </button>
      </span>

      {tooltip && createPortal(tooltip, document.body)}
    </>
  );
}
