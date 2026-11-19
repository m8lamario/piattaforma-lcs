/** Slack for iOS, which often stops a few pixels short of scrollHeight. */
export const LEGAL_SCROLL_SLACK_PX = 64;

export function scrollerReachedEnd(
  el: { scrollHeight: number; clientHeight: number; scrollTop: number },
  slack = LEGAL_SCROLL_SLACK_PX,
) {
  const overflow = el.scrollHeight - el.clientHeight;
  if (overflow <= slack) return true;
  return overflow - el.scrollTop <= slack;
}

/** True when the end of the text is inside the visible screen, whatever element is scrolling. */
export function endMarkerIsVisible(
  rect: { top: number; bottom: number },
  viewport: { top: number; height: number },
  slack = 120,
) {
  if (rect.bottom <= viewport.top) return false;
  return rect.top <= viewport.top + viewport.height + slack;
}
