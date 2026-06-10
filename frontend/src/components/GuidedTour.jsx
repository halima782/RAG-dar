import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { TOUR_STEPS } from "../tour/steps";

const PADDING = 8;
const TOOLTIP_GAP = 12;

function getTargetRect(selector) {
  if (!selector) return null;

  const el = document.querySelector(selector);
  if (!el) return null;

  const rect = el.getBoundingClientRect();
  return {
    top: rect.top - PADDING,
    left: rect.left - PADDING,
    width: rect.width + PADDING * 2,
    height: rect.height + PADDING * 2,
  };
}

function getTooltipPosition(rect, placement, tooltipSize) {
  if (!rect) {
    return {
      top: window.innerHeight / 2 - tooltipSize.height / 2,
      left: window.innerWidth / 2 - tooltipSize.width / 2,
    };
  }

  const positions = {
    right: {
      top: rect.top + rect.height / 2 - tooltipSize.height / 2,
      left: rect.left + rect.width + TOOLTIP_GAP,
    },
    left: {
      top: rect.top + rect.height / 2 - tooltipSize.height / 2,
      left: rect.left - tooltipSize.width - TOOLTIP_GAP,
    },
    top: {
      top: rect.top - tooltipSize.height - TOOLTIP_GAP,
      left: rect.left + rect.width / 2 - tooltipSize.width / 2,
    },
    bottom: {
      top: rect.top + rect.height + TOOLTIP_GAP,
      left: rect.left + rect.width / 2 - tooltipSize.width / 2,
    },
  };

  const pos = positions[placement] ?? positions.bottom;

  return {
    top: Math.max(16, Math.min(pos.top, window.innerHeight - tooltipSize.height - 16)),
    left: Math.max(16, Math.min(pos.left, window.innerWidth - tooltipSize.width - 16)),
  };
}

export default function GuidedTour({ isOpen, onClose, onComplete }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlight, setSpotlight] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [tooltipRef, setTooltipRef] = useState(null);

  const step = TOUR_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  const updatePositions = useCallback(() => {
    const rect = getTargetRect(step?.target);
    setSpotlight(rect);

    if (tooltipRef) {
      const size = {
        width: tooltipRef.offsetWidth,
        height: tooltipRef.offsetHeight,
      };
      setTooltipPos(getTooltipPosition(rect, step?.placement, size));
    }
  }, [step, tooltipRef]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePositions();
  }, [isOpen, stepIndex, updatePositions, tooltipRef]);

  useEffect(() => {
    if (!isOpen) return;

    window.addEventListener("resize", updatePositions);
    window.addEventListener("scroll", updatePositions, true);

    return () => {
      window.removeEventListener("resize", updatePositions);
      window.removeEventListener("scroll", updatePositions, true);
    };
  }, [isOpen, updatePositions]);

  useEffect(() => {
    if (isOpen) {
      setStepIndex(0);
    }
  }, [isOpen]);

  if (!isOpen || !step) return null;

  const handleNext = () => {
    if (isLast) {
      onComplete?.();
      onClose();
      return;
    }
    setStepIndex((i) => i + 1);
  };

  const handleBack = () => {
    setStepIndex((i) => Math.max(0, i - 1));
  };

  const handleSkip = () => {
    onComplete?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Guided tour">
      {spotlight ? (
        <div
          className="absolute rounded-lg ring-4 ring-blue-400 pointer-events-none transition-all duration-300"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/60" />
      )}

      <div
        ref={setTooltipRef}
        className="absolute z-10 w-80 bg-white rounded-xl shadow-2xl p-5 transition-all duration-300"
        style={{ top: tooltipPos.top, left: tooltipPos.left }}
      >
        <p className="text-xs font-medium text-blue-500 mb-1">
          Step {stepIndex + 1} of {TOUR_STEPS.length}
        </p>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{step.content}</p>

        <div className="flex items-center justify-between mt-5 gap-2">
          <button
            onClick={handleSkip}
            className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1"
          >
            Skip tour
          </button>

          <div className="flex gap-2">
            {!isFirst && (
              <button
                onClick={handleBack}
                className="text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="text-sm font-medium px-4 py-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
            >
              {isLast ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
