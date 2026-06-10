import { useCallback, useLayoutEffect, useRef } from "react";

const NEAR_BOTTOM_THRESHOLD = 100;

export function useAutoScroll(messages, isActive) {
  const containerRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);

  const scrollToBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom <= NEAR_BOTTOM_THRESHOLD;
  }, []);

  const enableAutoScroll = useCallback(() => {
    shouldAutoScrollRef.current = true;
  }, []);

  useLayoutEffect(() => {
    if (!isActive || !shouldAutoScrollRef.current) return;
    scrollToBottom();
  }, [messages, isActive, scrollToBottom]);

  return { containerRef, handleScroll, enableAutoScroll, scrollToBottom };
}
