"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type PortalOverlayProps = {
  open: boolean;
  children: ReactNode;
  lockScroll?: boolean;
};

/** Renders overlays on document.body so ancestor overflow/transform cannot clip them. */
export function PortalOverlay({ open, children, lockScroll = true }: PortalOverlayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !lockScroll) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [lockScroll, open]);

  if (!open || !mounted) return null;

  return createPortal(children, document.body);
}
