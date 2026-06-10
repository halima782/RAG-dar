import { useCallback, useEffect, useState } from "react";
import { TOUR_STORAGE_KEY } from "../tour/steps";

export function useGuidedTour({ autoStart = true, ready = true } = {}) {
  const [isOpen, setIsOpen] = useState(false);

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
    if (!autoStart || !ready) return;

    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!completed) {
      const timer = setTimeout(() => setIsOpen(true), 600);
      return () => clearTimeout(timer);
    }
  }, [autoStart, ready]);

  return { isOpen, startTour, closeTour, completeTour };
}
