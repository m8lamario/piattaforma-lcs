import type { LeaguePlayerFilters } from "./status";

export function leagueFilterQuery(filters: LeaguePlayerFilters) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.schoolId) params.set("schoolId", filters.schoolId);
  if (filters.status) params.set("status", filters.status);
  if (filters.medical) params.set("medical", filters.medical);
  if (filters.payment) params.set("payment", filters.payment);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.dir) params.set("dir", filters.dir);
  const query = params.toString();
  return query ? `?${query}` : "";
}
