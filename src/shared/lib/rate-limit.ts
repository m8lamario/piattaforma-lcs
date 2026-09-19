export function allowRequest(
  store: Map<string, number[]>,
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): boolean {
  const from = now - windowMs;
  const recent = (store.get(key) ?? []).filter((timestamp) => timestamp > from);
  if (recent.length >= limit) {
    store.set(key, recent);
    return false;
  }
  recent.push(now);
  store.set(key, recent);
  return true;
}
