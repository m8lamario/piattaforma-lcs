"use client";

import { useActionState } from "react";
import { createEditionAction, deleteEditionAction, updateEditionAction } from "@/features/admin/actions";
import { REQUIREMENT_CODES } from "@/features/admin/schemas/org";
import { Button } from "@/shared/ui/Button";
import { ActionError } from "@/shared/ui/ActionError";
import { PendingSubmitButton } from "@/shared/ui/PendingSubmitButton";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
import styles from "./admin.module.css";

const REQ_LABEL: Record<(typeof REQUIREMENT_CODES)[number], string> = {
  PERSONAL_DATA: it.stepDati,
  GUARDIAN_IF_MINOR: it.stepTutore,
  MEDICAL_CERT: it.stepCertificato,
  PRIVACY: it.stepPrivacy,
  MEDIA_RELEASE: it.stepLiberatorie,
  PAYMENT: it.stepPagamento,
};

type Requirement = { code: string; required: boolean };

type Props = {
  mode: "create" | "edit";
  edition?: {
    id: string;
    name: string;
    year: number;
    paymentMode: string;
    playerFeeAmount: string | null;
    teamFeeAmount: string | null;
    isActive: boolean;
    registrationOpensAt: string;
    registrationClosesAt: string;
    competitionName: string;
    requirements: Requirement[];
    registrationCount?: number;
  };
};

export function EditionForm({ mode, edition }: Props) {
  const action = mode === "create" ? createEditionAction : updateEditionAction;
  const [state, formAction, pending] = useActionState(action, undefined);
  const required = new Set(edition?.requirements.filter((item) => item.required).map((item) => item.code));

  return (
    <form action={formAction} className={fields.form} noValidate aria-busy={pending}>
      {edition ? <input type="hidden" name="id" value={edition.id} /> : null}
      {mode === "create" ? (
        <div className={fields.field}>
          <label className={fields.label} htmlFor="competitionName">
            {it.adminCompetition}
          </label>
          <input id="competitionName" name="competitionName" className={fields.input} required defaultValue={edition?.competitionName} />
        </div>
      ) : (
        <p className={fields.help}>{edition?.competitionName}</p>
      )}
      <div className={fields.pair}>
        <div className={fields.field}>
          <label className={fields.label} htmlFor="editionName">
            {it.adminEdition}
          </label>
          <input id="editionName" name="editionName" className={fields.input} required defaultValue={edition?.name} />
        </div>
        <div className={fields.field}>
          <label className={fields.label} htmlFor="year">
            {it.adminYear}
          </label>
          <input id="year" name="year" type="number" className={fields.input} required defaultValue={edition?.year ?? 2026} />
        </div>
      </div>
      <div className={fields.field}>
        <label className={fields.label} htmlFor="paymentMode">
          {it.adminPaymentMode}
        </label>
        <select id="paymentMode" name="paymentMode" className={fields.input} defaultValue={edition?.paymentMode ?? "PLAYER"}>
          <option value="PLAYER">{it.paymentModePLAYER}</option>
          <option value="TEAM">{it.paymentModeTEAM}</option>
          <option value="BOTH">{it.paymentModeBOTH}</option>
        </select>
      </div>
      <div className={fields.pair}>
        <div className={fields.field}>
          <label className={fields.label} htmlFor="playerFeeAmount">
            {it.adminPlayerFee}
          </label>
          <input id="playerFeeAmount" name="playerFeeAmount" className={fields.input} defaultValue={edition?.playerFeeAmount ?? ""} />
        </div>
        <div className={fields.field}>
          <label className={fields.label} htmlFor="teamFeeAmount">
            {it.adminTeamFee}
          </label>
          <input id="teamFeeAmount" name="teamFeeAmount" className={fields.input} defaultValue={edition?.teamFeeAmount ?? ""} />
        </div>
      </div>
      <div className={fields.pair}>
        <div className={fields.field}>
          <label className={fields.label} htmlFor="registrationOpensAt">
            {it.adminOpensAt}
          </label>
          <input
            id="registrationOpensAt"
            name="registrationOpensAt"
            type="datetime-local"
            className={fields.input}
            defaultValue={edition?.registrationOpensAt}
          />
        </div>
        <div className={fields.field}>
          <label className={fields.label} htmlFor="registrationClosesAt">
            {it.adminClosesAt}
          </label>
          <input
            id="registrationClosesAt"
            name="registrationClosesAt"
            type="datetime-local"
            className={fields.input}
            defaultValue={edition?.registrationClosesAt}
          />
        </div>
      </div>
      <label className={styles.check}>
        <input type="checkbox" name="isActive" defaultChecked={edition?.isActive ?? true} />
        {it.adminEditionActive}
      </label>
      <fieldset className={styles.checks}>
        <legend className={styles.sectionTitle}>{it.adminRequirements}</legend>
        {REQUIREMENT_CODES.map((code) => (
          <label key={code} className={styles.check}>
            <input type="checkbox" name={`req_${code}`} defaultChecked={edition ? required.has(code) : code !== "MEDIA_RELEASE"} />
            {REQ_LABEL[code]}
          </label>
        ))}
      </fieldset>
      {state?.error ? <ActionError error={state.error} code={state.code} /> : null}
      <div className={fields.actions}>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? it.saving : it.save}
        </Button>
      </div>
    </form>
  );
}

export function EditionDeleteForm({
  editionId,
  registrationCount,
}: {
  editionId: string;
  registrationCount: number;
}) {
  if (registrationCount > 0) {
    return <p className={fields.help}>{it.adminEditionHasRegistrations}</p>;
  }
  return (
    <form action={deleteEditionAction}>
      <input type="hidden" name="id" value={editionId} />
      <PendingSubmitButton idle={it.adminDeleteEdition} pendingLabel={it.deleting} variant="danger" />
    </form>
  );
}
