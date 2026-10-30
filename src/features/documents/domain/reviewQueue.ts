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

export function nextPendingAfter(queue: readonly ReviewQueueItem[], current: ReviewQueueItem) {
  const later = queue.find(
    (item) =>
      item.uploadedAt.getTime() > current.uploadedAt.getTime() ||
      (item.uploadedAt.getTime() === current.uploadedAt.getTime() && item.id > current.id),
  );
  return later?.id ?? queue[0]?.id ?? null;
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
