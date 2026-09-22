export function resolveSelectedTeamId(teamIds: string[], cookieValue: string | undefined | null) {
  if (cookieValue && teamIds.includes(cookieValue)) return cookieValue;
  return teamIds[0] ?? null;
}
