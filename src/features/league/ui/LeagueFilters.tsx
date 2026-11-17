import { Button, ButtonLink } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
import {
  LEAGUE_MEDICAL_STATUSES,
  LEAGUE_PAYMENT_STATUSES,
  LEAGUE_REGISTRATION_STATUSES,
  LEAGUE_SORTS,
  type LeaguePlayerFilters,
} from "@/features/league/domain/status";
import {
  leagueMedicalLabel,
  leaguePaymentLabel,
  leagueRegistrationLabel,
} from "@/features/league/domain/copy";
import styles from "./league.module.css";

const SORT_LABEL: Record<(typeof LEAGUE_SORTS)[number], string> = {
  lastName: it.leagueSortLastName,
  school: it.leagueSortSchool,
  status: it.leagueSortStatus,
  medical: it.leagueSortMedical,
  payment: it.leagueSortPayment,
  completedAt: it.leagueSortCompletedAt,
};

type Props = {
  action: string;
  filters: LeaguePlayerFilters;
  schools: { schoolId: string; schoolName: string }[];
  hideSchool?: boolean;
};

export function LeagueFilters({ action, filters, schools, hideSchool = false }: Props) {
  return (
    <form className={styles.filters} method="get" action={action}>
      <div className={styles.filtersRow}>
        <div className={fields.field}>
          <label className={fields.label} htmlFor="q">
            {it.leagueFilterSearch}
          </label>
          <input id="q" name="q" className={fields.input} defaultValue={filters.q ?? ""} maxLength={80} />
        </div>
        {hideSchool ? null : (
          <div className={fields.field}>
            <label className={fields.label} htmlFor="schoolId">
              {it.leagueFilterSchool}
            </label>
            <select id="schoolId" name="schoolId" className={fields.input} defaultValue={filters.schoolId ?? ""}>
              <option value="">{it.leagueAllSchools}</option>
              {schools.map((school) => (
                <option key={school.schoolId} value={school.schoolId}>
                  {school.schoolName}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className={fields.field}>
          <label className={fields.label} htmlFor="status">
            {it.leagueFilterStatus}
          </label>
          <select id="status" name="status" className={fields.input} defaultValue={filters.status ?? ""}>
            <option value="">{it.leagueAllStatuses}</option>
            {LEAGUE_REGISTRATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {leagueRegistrationLabel(status)}
              </option>
            ))}
          </select>
        </div>
        <div className={fields.field}>
          <label className={fields.label} htmlFor="medical">
            {it.leagueFilterMedical}
          </label>
          <select id="medical" name="medical" className={fields.input} defaultValue={filters.medical ?? ""}>
            <option value="">{it.leagueAllMedical}</option>
            {LEAGUE_MEDICAL_STATUSES.map((status) => (
              <option key={status} value={status}>
                {leagueMedicalLabel(status)}
              </option>
            ))}
          </select>
        </div>
        <div className={fields.field}>
          <label className={fields.label} htmlFor="payment">
            {it.leagueFilterPayment}
          </label>
          <select id="payment" name="payment" className={fields.input} defaultValue={filters.payment ?? ""}>
            <option value="">{it.leagueAllPayments}</option>
            {LEAGUE_PAYMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {leaguePaymentLabel(status)}
              </option>
            ))}
          </select>
        </div>
        <div className={fields.field}>
          <label className={fields.label} htmlFor="sort">
            {it.leagueSort}
          </label>
          <select id="sort" name="sort" className={fields.input} defaultValue={filters.sort ?? "lastName"}>
            {LEAGUE_SORTS.map((sort) => (
              <option key={sort} value={sort}>
                {SORT_LABEL[sort]}
              </option>
            ))}
          </select>
        </div>
        <div className={fields.field}>
          <label className={fields.label} htmlFor="dir">
            {it.leagueSortDir}
          </label>
          <select id="dir" name="dir" className={fields.input} defaultValue={filters.dir ?? "asc"}>
            <option value="asc">{it.leagueSortAsc}</option>
            <option value="desc">{it.leagueSortDesc}</option>
          </select>
        </div>
      </div>
      <div className={styles.actions}>
        <Button type="submit">{it.leagueFilterApply}</Button>
        <ButtonLink href={action} variant="ghost">
          {it.leagueFilterReset}
        </ButtonLink>
      </div>
    </form>
  );
}
