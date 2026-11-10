export type ReviewQueueItem = {
  id: string;
  uploadedAt: Date;
};

export type ReviewQueuePosition = {
  inQueue: boolean;
  position: number | null;
  total: number;
  remaining: number;
  prevId: string | null;
  nextId: string | null;
};

export function reviewQueuePosition(queue: readonly ReviewQueueItem[], documentId: string): ReviewQueuePosition {
  const index = queue.findIndex((item) => item.id === documentId);
  if (index < 0) {
    return {
      inQueue: false,
      position: null,
      total: queue.length,
      remaining: queue.length,
      prevId: null,
      nextId: queue[0]?.id ?? null,
    };
  }
  return {
    inQueue: true,
    position: index + 1,
    total: queue.length,
    remaining: queue.length - index - 1,
    prevId: queue[index - 1]?.id ?? null,
    nextId: queue[index + 1]?.id ?? null,
  };
}

function compareReviewQueue(a: ReviewQueueItem, b: ReviewQueueItem) {
  const byTime = a.uploadedAt.getTime() - b.uploadedAt.getTime();
  if (byTime !== 0) return byTime;
  if (a.id < b.id) return -1;
  if (a.id > b.id) return 1;
  return 0;
}

/**
 * Id da aprire dopo che `reviewedId` esce dalla coda.
 * La coda è nello stesso ordine del pulsante Successivo.
 * In fondo si torna al primo ancora in attesa. Se l'id non è nella coda, null:
 * non si indovina il primo, che spesso è un certificato già visto.
 */
export function selectNextAfterReview(queue: readonly { id: string }[], reviewedId: string): string | null {
  const index = queue.findIndex((item) => item.id === reviewedId);
  const remaining = queue.filter((item) => item.id !== reviewedId);
  if (remaining.length === 0 || index < 0) return null;
  return remaining[index]?.id ?? remaining[0]?.id ?? null;
}

export function nextPendingAfter(queue: readonly ReviewQueueItem[], current: ReviewQueueItem) {
  const ordered = [...queue.filter((item) => item.id !== current.id), current].sort(compareReviewQueue);
  return selectNextAfterReview(ordered, current.id);
}

export type AppliedReview<T extends { id: string }> =
  | { status: "ignored" }
  | { status: "done"; queue: T[] }
  | { status: "next"; currentId: string; queue: T[] };

/**
 * Applica l'esito di un'approvazione o di un rifiuto.
 * Il successore è l'id successivo nella coda che era a schermo, se è ancora in attesa.
 * Un nextId del server che punta a un certificato già visto non sposta la selezione indietro.
 */
export function applyReviewResult<T extends { id: string }>(
  currentId: string,
  previousQueue: readonly { id: string }[],
  result: { reviewedId: string; nextId: string | null; queue: readonly T[] },
): AppliedReview<T> {
  if (result.reviewedId !== currentId) return { status: "ignored" };
  const queue = result.queue.filter((item) => item.id !== result.reviewedId);
  if (queue.length === 0) return { status: "done", queue };

  const successor = selectNextAfterReview(previousQueue, result.reviewedId);
  if (successor && queue.some((item) => item.id === successor)) {
    return { status: "next", currentId: successor, queue };
  }
  if (result.nextId && result.nextId !== result.reviewedId && queue.some((item) => item.id === result.nextId)) {
    return { status: "next", currentId: result.nextId, queue };
  }
  return { status: "next", currentId: queue[0]!.id, queue };
}

export function reviewQueueQuery(filters: { teamId?: string; q?: string }) {
  const params = new URLSearchParams();
  if (filters.teamId) params.set("teamId", filters.teamId);
  if (filters.q) params.set("q", filters.q);
  const text = params.toString();
  return text ? `?${text}` : "";
}

export function reviewDocumentHref(id: string, filters: { teamId?: string; q?: string }) {
  return `/admin/documenti/${id}${reviewQueueQuery(filters)}`;
}

export function reviewDoneHref(filters: { teamId?: string; q?: string }) {
  const params = new URLSearchParams();
  if (filters.teamId) params.set("teamId", filters.teamId);
  if (filters.q) params.set("q", filters.q);
  params.set("done", "1");
  return `/admin/documenti?${params.toString()}`;
}
