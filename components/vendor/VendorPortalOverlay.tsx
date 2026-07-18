"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type VendorPortalOverlayProps = {
  open: boolean;
  children: ReactNode;
};

/** Renders overlays on document.body so dashboard overflow/transform cannot clip them. */
export function VendorPortalOverlay({ open, children }: VendorPortalOverlayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(children, document.body);
}
