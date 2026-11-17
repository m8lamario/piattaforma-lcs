import { z } from "zod";
import {
  LEAGUE_MEDICAL_STATUSES,
  LEAGUE_PAYMENT_STATUSES,
  LEAGUE_REGISTRATION_STATUSES,
  LEAGUE_SORTS,
} from "@/features/league/domain/status";

export const leaguePlayerFilterSchema = z.object({
  q: z.string().trim().max(80).optional(),
  schoolId: z.string().min(1).optional(),
  status: z.enum(LEAGUE_REGISTRATION_STATUSES).optional(),
  medical: z.enum(LEAGUE_MEDICAL_STATUSES).optional(),
  payment: z.enum(LEAGUE_PAYMENT_STATUSES).optional(),
  sort: z.enum(LEAGUE_SORTS).optional(),
  dir: z.enum(["asc", "desc"]).optional(),
  editionId: z.string().optional(),
});

export function parseLeaguePlayerFilters(input: Record<string, string | undefined>) {
  const parsed = leaguePlayerFilterSchema.safeParse({
    q: input.q || undefined,
    schoolId: input.schoolId || undefined,
    status: input.status || undefined,
    medical: input.medical || undefined,
    payment: input.payment || undefined,
    sort: input.sort || undefined,
    dir: input.dir || undefined,
    editionId: input.editionId,
  });
  if (!parsed.success) return {};
  return {
    q: parsed.data.q,
    schoolId: parsed.data.schoolId,
    status: parsed.data.status,
    medical: parsed.data.medical,
    payment: parsed.data.payment,
    sort: parsed.data.sort,
    dir: parsed.data.dir,
  };
}
