export const REVIEW_PRELOAD_AHEAD = 2;
export const REVIEW_FILE_CACHE_LIMIT = 5;
export const REVIEW_METADATA_BATCH_LIMIT = 5;

export function reviewPreloadIds(queue: readonly { id: string }[], currentId: string): string[] {
  const index = queue.findIndex((item) => item.id === currentId);
  if (index < 0) return [currentId];
  const end = Math.min(queue.length - 1, index + REVIEW_PRELOAD_AHEAD);
  const ids: string[] = [];
  for (let i = index; i <= end; i += 1) {
    ids.push(queue[i]!.id);
  }
  return ids;
}

/** Document ids to drop from the in-memory file cache (everything not in `keepIds`). */
export function fileCacheEvictionTargets(keepIds: readonly string[], cachedIds: readonly string[]): string[] {
  const keep = new Set(keepIds);
  return cachedIds.filter((id) => !keep.has(id));
}
