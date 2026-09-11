"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tracks whether a horizontally-scrollable row's content is wider than its
 * visible container. Used to switch a row between "centered, no scroll"
 * (when everything fits on one line) and "left-aligned, scrollable with
 * arrows" (when it overflows).
 */
export function useSliderOverflow<T extends HTMLElement>(deps: unknown[] = []) {
  const ref = useRef<T>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const check = () => {
      setIsOverflowing(el.scrollWidth - el.clientWidth > 4);
    };

    check();

    const resizeObserver = new ResizeObserver(check);
    resizeObserver.observe(el);
    window.addEventListener("resize", check);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", check);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const scrollBy = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return { ref, isOverflowing, scrollBy };
}
