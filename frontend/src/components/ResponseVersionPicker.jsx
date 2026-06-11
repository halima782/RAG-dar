function ChevronIcon({ direction }) {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      {direction === "left" ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      )}
    </svg>
  );
}

export default function ResponseVersionPicker({
  versionCount,
  activeIndex,
  onPrevious,
  onNext,
  disabled,
}) {
  if (versionCount <= 1) return null;

  return (
    <div
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-gray-100 border border-gray-200 text-xs text-gray-600"
      aria-label={`Response version ${activeIndex + 1} of ${versionCount}`}
    >
      <button
        type="button"
        onClick={onPrevious}
        disabled={disabled || activeIndex <= 0}
        className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Previous version"
        title="Previous version"
      >
        <ChevronIcon direction="left" />
      </button>
      <span className="px-1 tabular-nums font-medium min-w-[3.5rem] text-center">
        {activeIndex + 1} / {versionCount}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={disabled || activeIndex >= versionCount - 1}
        className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Next version"
        title="Next version"
      >
        <ChevronIcon direction="right" />
      </button>
    </div>
  );
}
