"use client";

import { useCallback, useRef } from "react";

export function useHorizontalScroll() {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = useCallback((dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    const cs = getComputedStyle(el);
    const pl = parseFloat(cs.paddingLeft) || 0;
    const pr = parseFloat(cs.paddingRight) || 0;
    const page = el.clientWidth - pl - pr;
    el.scrollBy({ left: dir * page, behavior: "smooth" });
  }, []);

  return { ref, scroll };
}
