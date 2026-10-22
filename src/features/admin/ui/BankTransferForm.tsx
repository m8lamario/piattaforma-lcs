"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { recordTeamBankTransferAction } from "@/features/payments/record-bank-transfer";
import {
  formatTransferDifference,
  parseTransferDate,
  parseTransferReference,
  type BankTransferQuote,
} from "@/features/payments/domain/bank-transfer";
import { formatEuro, parseEuroToCents } from "@/features/payments/domain/fees";
import { paymentMethodLabel } from "@/features/payments/domain/export";
import { ActionError } from "@/shared/ui/ActionError";
import { Button } from "@/shared/ui/Button";
import { PendingSubmitButton } from "@/shared/ui/PendingSubmitButton";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
import styles from "./admin.module.css";

type Option = { id: string; label: string };

type HistoryRow = {
  id: string;
  teamName: string;
  amountLabel: string;
  expectedLabel: string;
  reference: string;
  paidOn: string;
  operator: string;
};

type Props = {
  editions: Option[];
  teams: Option[];
  editionId: string;
  teamId: string;
  currency: string;
  quote: BankTransferQuote | null;
  history: HistoryRow[];
  today: string;
};

function roleLabel(category: "PLAYER" | "STAFF") {
  return category === "STAFF" ? it.adminFeesStaff : it.adminFeesPlayer;
}

export function BankTransferForm({
  editions,
  teams,
  editionId,
  teamId,
  currency,
  quote,
  history,
  today,
}: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState(recordTeamBankTransferAction, undefined);
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(today);
  const [reference, setReference] = useState("");
  const [confirm, setConfirm] = useState<string[] | null>(null);
  const [difference, setDifference] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [acked, setAcked] = useState(state);
  if (state?.saved && acked !== state) {
    setAcked(state);
    setConfirm(null);
    setDifference(null);
    setAmount("");
    setReference("");
    setPaidOn(today);
    setLocalError(null);
  }

  function go(nextEdition: string, nextTeam: string) {
    const params = new URLSearchParams();
    if (nextEdition) params.set("editionId", nextEdition);
    if (nextEdition && nextTeam) params.set("teamId", nextTeam);
    const query = params.toString();
    router.push(query ? `/admin/pagamenti/bonifico?${query}` : "/admin/pagamenti/bonifico");
  }

  function review() {
    if (!quote || quote.status !== "ready") return;
    const parsed = parseEuroToCents(amount);
    const date = parseTransferDate(paidOn);
    const ref = parseTransferReference(reference);
    if (!parsed.ok || !date || !ref) {
      setLocalError(it.adminBankInvalid);
      setConfirm(null);
      setDifference(null);
      return;
    }
    const gap = formatTransferDifference(parsed.cents - quote.expectedCents, currency);
    const lines = [
      `${it.adminBankExpected}: ${formatEuro(quote.expectedCents)} ${currency}`,
      `${it.adminBankReceived}: ${formatEuro(parsed.cents)} ${currency}`,
      `${it.adminBankReference}: ${ref}`,
      `${it.adminBankDate}: ${paidOn}`,
    ];
    setDifference(gap);
    setLocalError(null);
    setConfirm(lines);
  }

  const ready = quote?.status === "ready" ? quote : null;
  const okBanner = `${fields.banner} ${fields.bannerOk}`;
  const dangerBanner = `${fields.banner} ${fields.bannerDanger}`;
  const warnBanner = `${fields.banner} ${fields.bannerWarn}`;

  return (
    <div className={styles.colMain}>
      {state?.saved ? (
        <p className={okBanner} role="status">
          {it.adminBankSaved}
        </p>
      ) : null}
      {localError ? <p className={dangerBanner}>{localError}</p> : null}

      <section className={styles.sideCard}>
        <h2 className={styles.sectionTitle}>{it.adminBankPick}</h2>
        <div className={styles.feeGrid}>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="bank-edition">
              {it.adminBankEdition}
            </label>
            <select
              id="bank-edition"
              className={fields.input}
              value={editionId}
              onChange={(event) => go(event.target.value, "")}
            >
              <option value="">{it.adminBankChoose}</option>
              {editions.map((edition) => (
                <option key={edition.id} value={edition.id}>
                  {edition.label}
                </option>
              ))}
            </select>
          </div>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="bank-team">
              {it.adminBankTeam}
            </label>
            <select
              id="bank-team"
              className={fields.input}
              value={teamId}
              disabled={!editionId}
              onChange={(event) => go(editionId, event.target.value)}
            >
              <option value="">{it.adminBankChoose}</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {quote?.status === "missing" ? (
        <p className={dangerBanner}>
          {it.adminBankMissing}
          {quote.names.length === 0 ? null : " " + quote.names.join(", ") + "."}
        </p>
      ) : null}
      {quote?.status === "nothing_due" ? <p className={styles.meta}>{it.adminBankNothing}</p> : null}

      {ready ? (
        <section className={styles.sideCard}>
          <h2 className={styles.sectionTitle}>{it.adminBankTotal}</h2>
          <p className={styles.meta}>{ready.channel === "team" ? it.adminBankTeamHelp : it.adminBankMembersHelp}</p>
          <p>
            <strong>
              {formatEuro(ready.expectedCents)} {currency}
            </strong>
          </p>
          {ready.due.length !== 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{it.adminBankPerson}</th>
                    <th>{it.adminFeesFilter}</th>
                    <th>{it.adminBankAmount}</th>
                  </tr>
                </thead>
                <tbody>
                  {ready.due.map((line) => (
                    <tr key={line.registrationId}>
                      <td>{line.name || it.adminBankUnnamed}</td>
                      <td>{roleLabel(line.category)}</td>
                      <td>
                        {formatEuro(line.cents)} {currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {ready.roster.length !== 0 ? (
            <ul className={styles.confirmList}>
              {ready.roster.map((person) => (
                <li key={person.registrationId}>
                  {person.name || it.adminBankUnnamed} · {roleLabel(person.category)}
                </li>
              ))}
            </ul>
          ) : null}
          {ready.skipped.length !== 0 ? (
            <div>
              <p className={styles.meta}>{it.adminBankSkipped}</p>
              <ul className={styles.confirmList}>
                {ready.skipped.map((person) => (
                  <li key={person.provider + "-" + person.name}>
                    {person.name || it.adminBankUnnamed} · {paymentMethodLabel(person.provider)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {confirm ? (
            <form action={action} className={fields.form}>
              <input type="hidden" name="editionId" value={editionId} />
              <input type="hidden" name="teamId" value={teamId} />
              <input type="hidden" name="amount" value={amount} />
              <input type="hidden" name="paidOn" value={paidOn} />
              <input type="hidden" name="reference" value={reference} />
              <input type="hidden" name="confirm" value="yes" />
              <ul className={styles.confirmList}>
                {confirm.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {difference ? <p className={warnBanner}>{difference}</p> : null}
              {!difference ? <p className={styles.meta}>{it.adminBankMatch}</p> : <p className={styles.meta}>{it.adminBankMismatch}</p>}
              {state?.error ? <ActionError error={state.error} code={state.code} /> : null}
              <div className={fields.actions}>
                <PendingSubmitButton idle={it.adminBankConfirm} pendingLabel={it.adminBankSaving} />
                <Button type="button" variant="ghost" onClick={() => setConfirm(null)} disabled={pending}>
                  {it.adminFeesCancel}
                </Button>
              </div>
            </form>
          ) : (
            <div className={fields.form}>
              <div className={styles.feeGrid}>
                <div className={fields.field}>
                  <label className={fields.label} htmlFor="bank-amount">
                    {it.adminBankReceived}
                  </label>
                  <input
                    id="bank-amount"
                    className={fields.input}
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                </div>
                <div className={fields.field}>
                  <label className={fields.label} htmlFor="bank-date">
                    {it.adminBankDate}
                  </label>
                  <input
                    id="bank-date"
                    className={fields.input}
                    type="date"
                    max={today}
                    value={paidOn}
                    onChange={(event) => setPaidOn(event.target.value)}
                  />
                </div>
                <div className={fields.field}>
                  <label className={fields.label} htmlFor="bank-reference">
                    {it.adminBankReference}
                  </label>
                  <input
                    id="bank-reference"
                    className={fields.input}
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    maxLength={80}
                  />
                </div>
              </div>
              <div className={fields.actions}>
                <Button type="button" onClick={review}>
                  {it.adminBankReview}
                </Button>
              </div>
            </div>
          )}
        </section>
      ) : null}

      {history.length !== 0 ? (
        <section>
          <h2 className={styles.sectionTitle}>{it.adminBankHistory}</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{it.adminBankTeam}</th>
                  <th>{it.adminBankReceived}</th>
                  <th>{it.adminBankExpected}</th>
                  <th>{it.adminBankDate}</th>
                  <th>{it.adminBankReference}</th>
                  <th>{it.adminBankOperator}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id}>
                    <td>{row.teamName}</td>
                    <td>{row.amountLabel}</td>
                    <td>{row.expectedLabel}</td>
                    <td>{row.paidOn}</td>
                    <td>{row.reference}</td>
                    <td>{row.operator}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
