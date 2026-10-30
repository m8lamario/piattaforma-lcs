"use client";

import { useState } from "react";
import {
  previewBankAllocation,
  type BankAllocationPerson,
  type BankAllocationReason,
} from "@/features/payments/domain/bank-transfer";
import { formatSignedEuro } from "@/features/payments/domain/fees";
import { paymentMethodLabel } from "@/features/payments/domain/export";
import { StatusChip } from "@/shared/ui/StatusChip";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
import styles from "./admin.module.css";

type Props = {
  people: BankAllocationPerson[];
  currency: string;
  receivedCents: number | null;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

function roleLabel(category: "PLAYER" | "STAFF") {
  return category === "STAFF" ? it.adminFeesStaff : it.adminFeesPlayer;
}

function reasonLabel(reason: BankAllocationReason, provider: string | null) {
  if (reason === "inactive") return it.adminBankReasonInactive;
  if (reason === "paid_elsewhere") {
    return provider ? `${it.adminBankReasonPaid} · ${paymentMethodLabel(provider)}` : it.adminBankReasonPaid;
  }
  if (reason === "fee_missing") return it.adminBankReasonMissing;
  if (reason === "not_due") return it.adminBankReasonNotDue;
  if (reason === "insufficient") return it.adminBankReasonInsufficient;
  return it.adminBankInvalidSelection;
}

function money(cents: number, currency: string) {
  return `${formatSignedEuro(cents)} ${currency}`;
}

export function BankTransferPeoplePicker({ people, currency, receivedCents, selectedIds, onChange }: Props) {
  const [search, setSearch] = useState("");
  const preview =
    receivedCents == null ? null : previewBankAllocation({ receivedCents, people, selectedIds });
  const query = search.trim().toLocaleLowerCase("it");
  const visible = [...people]
    .sort((a, b) => {
      const rank = (person: BankAllocationPerson) => (person.linkedCents != null ? 0 : person.blocked ? 2 : 1);
      return rank(a) - rank(b) || a.name.localeCompare(b.name, "it");
    })
    .filter((person) => {
      if (!query) return true;
      return `${person.name} ${person.email}`.toLocaleLowerCase("it").includes(query);
    });

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]);
  }

  function selectFit() {
    if (receivedCents == null) return;
    const next = new Set(selectedIds);
    const candidates = visible
      .filter((person) => !selectedIds.includes(person.registrationId))
      .sort((a, b) => a.name.localeCompare(b.name, "it"));
    for (const person of candidates) {
      const trial = previewBankAllocation({
        receivedCents,
        people,
        selectedIds: [...next, person.registrationId],
      });
      if (trial.reason == null) next.add(person.registrationId);
    }
    onChange([...next]);
  }

  return (
    <div className={styles.stack}>
      {preview ? (
        <>
          <div className={styles.amountStats}>
            <p className={styles.amountStat}>
              <span>{it.adminBankReceived}</span>
              <strong>{money(receivedCents ?? 0, currency)}</strong>
            </p>
            <p className={styles.amountStat}>
              <span>{it.adminBankUsed}</span>
              <strong>{money(preview.usedCents, currency)}</strong>
            </p>
            <p className={styles.amountStat}>
              <span>{it.adminBankResidual}</span>
              <strong>{money(preview.residualCents, currency)}</strong>
            </p>
          </div>
          <div
            className={styles.meter}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={preview.progressPercent}
            aria-label={it.adminBankProgress}
          >
            <span
              className={preview.overCents > 0 ? styles.meterFillOver : styles.meterFill}
              style={{ width: `${preview.progressPercent}%` }}
            />
          </div>
          <p className={styles.meta}>
            {it.adminBankProgress} · {preview.progressPercent}%
            {preview.overCents > 0 ? ` · ${it.adminBankOver}` : ""}
          </p>
        </>
      ) : (
        <p className={styles.meta}>{it.adminBankAmountFirst}</p>
      )}

      <div className={styles.toolbar}>
        <div className={`${fields.field} ${styles.searchField}`}>
          <label className={fields.label} htmlFor="bank-people-search">
            {it.adminBankSearch}
          </label>
          <input
            id="bank-people-search"
            className={fields.input}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Button type="button" variant="secondary" onClick={selectFit} disabled={receivedCents == null}>
          {it.adminBankSelectFit}
        </Button>
      </div>

      {people.length === 0 ? <p className={styles.meta}>{it.adminBankNoPeople}</p> : null}
      {people.length > 0 && visible.length === 0 ? <p className={styles.meta}>{it.adminBankNoMatch}</p> : null}

      <ul className={styles.personList}>
        {visible.map((person) => {
          const row = preview?.rows.find((item) => item.registrationId === person.registrationId);
          const checked = selectedIds.includes(person.registrationId);
          const disabled = !checked && (person.blocked != null || row?.reason === "insufficient");
          const removing = person.linkedCents != null && !checked;
          const cents = checked || removing ? (person.linkedCents ?? person.feeCents) : person.feeCents;
          const reason = row?.reason ?? person.blocked;
          return (
            <li key={person.registrationId}>
              <label className={`${styles.personRow} ${disabled ? styles.personRowDisabled : ""}`}>
                <input
                  className={styles.personCheck}
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(person.registrationId)}
                />
                <span className={styles.personIdentity}>
                  <strong>{person.name || it.adminBankUnnamed}</strong>
                  <span className={styles.meta}>
                    {roleLabel(person.category)}
                    {person.email ? ` · ${person.email}` : ""}
                  </span>
                  {reason ? <span className={styles.meta}>{reasonLabel(reason, person.provider)}</span> : null}
                </span>
                <span className={styles.personAside}>
                  {cents != null ? <strong>{money(cents, currency)}</strong> : null}
                  {checked && person.linkedCents != null ? <StatusChip tone="success">{it.adminBankLinked}</StatusChip> : null}
                  {checked && person.linkedCents == null ? <StatusChip tone="attention">{it.adminBankAdding}</StatusChip> : null}
                  {removing ? <StatusChip tone="attention">{it.adminBankRemoving}</StatusChip> : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
