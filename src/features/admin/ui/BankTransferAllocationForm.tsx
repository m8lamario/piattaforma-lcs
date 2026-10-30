"use client";

import { useActionState, useState } from "react";
import { updateTeamBankTransferPeopleAction } from "@/features/payments/record-bank-transfer";
import { BankTransferPeoplePicker } from "@/features/admin/ui/BankTransferPeoplePicker";
import {
  previewBankAllocation,
  type BankAllocationPerson,
} from "@/features/payments/domain/bank-transfer";
import { formatEuro, formatSignedEuro } from "@/features/payments/domain/fees";
import { ActionError } from "@/shared/ui/ActionError";
import { Button } from "@/shared/ui/Button";
import { PendingSubmitButton } from "@/shared/ui/PendingSubmitButton";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
import styles from "./admin.module.css";

type Props = {
  transferId: string;
  currency: string;
  receivedCents: number;
  people: BankAllocationPerson[];
};

function linkedIds(people: readonly BankAllocationPerson[]) {
  return people.filter((person) => person.linkedCents != null).map((person) => person.registrationId);
}

export function BankTransferAllocationForm({ transferId, currency, receivedCents, people }: Props) {
  const [state, action, pending] = useActionState(updateTeamBankTransferPeopleAction, undefined);
  const linkedKey = linkedIds(people).sort().join("\n");
  const [seen, setSeen] = useState(linkedKey);
  const [selected, setSelected] = useState(() => linkedIds(people));
  const [confirm, setConfirm] = useState<string[] | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [acked, setAcked] = useState(state);
  if (seen !== linkedKey) {
    setSeen(linkedKey);
    setSelected(linkedIds(people));
    setConfirm(null);
    setLocalError(null);
  }
  if (state?.saved && acked !== state) {
    setAcked(state);
    setConfirm(null);
    setLocalError(null);
  }

  function review() {
    const preview = previewBankAllocation({ receivedCents, people, selectedIds: selected });
    if (preview.addIds.length === 0 && preview.removeIds.length === 0) {
      setLocalError(it.adminBankNoChange);
      setConfirm(null);
      return;
    }
    if (preview.reason === "insufficient") {
      setLocalError(it.errorPAYMENT_BANK_INSUFFICIENT);
      setConfirm(null);
      return;
    }
    if (preview.reason) {
      setLocalError(it.adminBankInvalidSelection);
      setConfirm(null);
      return;
    }
    const byId = new Map(people.map((person) => [person.registrationId, person]));
    const lines = [
      `${it.adminBankUsed}: ${formatEuro(preview.usedCents)} ${currency}`,
      `${it.adminBankResidual}: ${formatSignedEuro(preview.residualCents)} ${currency}`,
      ...preview.addIds.map((id) => {
        const person = byId.get(id);
        return `${it.adminBankAdding}: ${person?.name || it.adminBankUnnamed} · ${formatEuro(person?.feeCents ?? 0)} ${currency}`;
      }),
      ...preview.removeIds.map((id) => {
        const person = byId.get(id);
        return `${it.adminBankRemoving}: ${person?.name || it.adminBankUnnamed} · ${formatEuro(person?.linkedCents ?? 0)} ${currency}`;
      }),
    ];
    setLocalError(null);
    setConfirm(lines);
  }

  const dangerBanner = `${fields.banner} ${fields.bannerDanger}`;
  const okBanner = `${fields.banner} ${fields.bannerOk}`;

  return (
    <section className={styles.sideCard}>
      <h2 className={styles.sectionTitle}>{it.adminBankPeople}</h2>
      <p className={styles.meta}>{it.adminBankMembersHelp}</p>
      {state?.saved ? (
        <p className={okBanner} role="status">
          {it.adminBankPeopleSaved}
        </p>
      ) : null}
      {localError ? <p className={dangerBanner}>{localError}</p> : null}
      <BankTransferPeoplePicker
        people={people}
        currency={currency}
        receivedCents={receivedCents}
        selectedIds={selected}
        onChange={(ids) => {
          setSelected(ids);
          setConfirm(null);
        }}
      />
      {confirm ? (
        <form action={action} className={fields.form}>
          <input type="hidden" name="transferId" value={transferId} />
          <input type="hidden" name="confirm" value="yes" />
          {selected.map((id) => (
            <input key={id} type="hidden" name="registrationId" value={id} />
          ))}
          <ul className={styles.confirmList}>
            {confirm.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {state?.error ? <ActionError error={state.error} code={state.code} /> : null}
          <div className={fields.actions}>
            <PendingSubmitButton idle={it.adminBankSavePeople} pendingLabel={it.adminBankSaving} />
            <Button type="button" variant="ghost" onClick={() => setConfirm(null)} disabled={pending}>
              {it.adminFeesCancel}
            </Button>
          </div>
        </form>
      ) : (
        <div className={fields.actions}>
          <Button type="button" onClick={review}>
            {it.adminBankReviewPeople}
          </Button>
        </div>
      )}
    </section>
  );
}
