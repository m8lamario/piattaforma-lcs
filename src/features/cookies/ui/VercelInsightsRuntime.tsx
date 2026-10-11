"use client";

import { useEffect } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

function stopVercelInsights() {
  for (const script of document.querySelectorAll("script[src]")) {
    const src = script.getAttribute("src") ?? "";
    if (
      src.includes("va.vercel-scripts.com") ||
      src.includes("/_vercel/insights") ||
      src.includes("/_vercel/speed-insights")
    ) {
      script.remove();
    }
  }
  delete window.va;
  delete window.vaq;
  delete window.vai;
  delete window.vam;
  delete window.si;
  delete window.siq;
  delete window.sil;
}

export function VercelInsightsRuntime() {
  useEffect(() => stopVercelInsights, []);
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
