import { useCallback, useEffect, useRef, useState } from "react";
import { TOUR_STORAGE_KEY } from "../tour/steps";

const TOUR_READY_SELECTORS = [
  '[data-tour="sidebar"]',
  '[data-tour="chat-area"]',
  '[data-tour="chat-input"]',
];

function waitForTourTargets(maxAttempts = 30, intervalMs = 100) {
  return new Promise((resolve) => {
    let attempts = 0;

    const check = () => {
      const ready = TOUR_READY_SELECTORS.every((selector) =>
        document.querySelector(selector)
      );

      if (ready) {
        resolve(true);
        return;
      }

      attempts += 1;
      if (attempts >= maxAttempts) {
        resolve(false);
        return;
      }

      setTimeout(check, intervalMs);
    };

    check();
  });
}

export function useGuidedTour({ autoStart = true, ready = true, onAutoStart } = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const hasAutoStarted = useRef(false);

  const markComplete = useCallback(() => {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
  }, []);

  const startTour = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeTour = useCallback(() => {
    setIsOpen(false);
  }, []);

  const completeTour = useCallback(() => {
    markComplete();
    setIsOpen(false);
  }, [markComplete]);

  useEffect(() => {
    if (!autoStart || !ready || hasAutoStarted.current) return;

    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    if (completed) return;

    let cancelled = false;

    async function launchTour() {
      const targetsReady = await waitForTourTargets();
      if (cancelled || !targetsReady) return;

      await new Promise((resolve) => setTimeout(resolve, 500));
      if (cancelled) return;

      hasAutoStarted.current = true;
      onAutoStart?.();
      setIsOpen(true);
    }

    launchTour();

    return () => {
      cancelled = true;
    };
  }, [autoStart, ready, onAutoStart]);

  return { isOpen, startTour, closeTour, completeTour };
}
