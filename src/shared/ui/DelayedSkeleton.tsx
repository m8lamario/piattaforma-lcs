"use client";

import { useEffect, useState, type ReactNode } from "react";

const DELAY_MS = 200;

type Props = {
  children: ReactNode;
  delayMs?: number;
};

/**
 * App Router shows `loading.tsx` immediately. Hold the skeleton briefly so
 * fast navigations do not flash a placeholder when data is already ready.
 */
export function DelayedSkeleton({ children, delayMs = DELAY_MS }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const waitMs = reduceMotion ? 0 : delayMs;
    const timer = window.setTimeout(() => setVisible(true), waitMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);

  if (!visible) return null;
  return children;
}
