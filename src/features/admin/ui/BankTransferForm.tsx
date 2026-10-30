"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { recordTeamBankTransferAction } from "@/features/payments/record-bank-transfer";
import { BankTransferPeoplePicker } from "@/features/admin/ui/BankTransferPeoplePicker";
import {
  formatTransferDifference,
  parseTransferDate,
  parseTransferReference,
  previewBankAllocation,
  type BankAllocationPerson,
  type BankTransferQuote,
} from "@/features/payments/domain/bank-transfer";
import { formatEuro, formatSignedEuro, parseEuroToCents, type PaymentMode } from "@/features/payments/domain/fees";
import { ActionError } from "@/shared/ui/ActionError";
import { Button, ButtonLink } from "@/shared/ui/Button";
import { PendingSubmitButton } from "@/shared/ui/PendingSubmitButton";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
import styles from "./admin.module.css";

type Option = { id: string; label: string };

type HistoryRow = {
  id: string;
  teamName: string;
  amountLabel: string;
  usedLabel: string;
  residualLabel: string;
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
  paymentMode: PaymentMode | null;
  people: BankAllocationPerson[];
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
  paymentMode,
  people,
  quote,
  history,
  today,
}: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState(recordTeamBankTransferAction, undefined);
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(today);
  const [reference, setReference] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState(teamId);
  const [confirm, setConfirm] = useState<string[] | null>(null);
  const [difference, setDifference] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [acked, setAcked] = useState(state);
  if (selectedTeam !== teamId) {
    setSelectedTeam(teamId);
    setSelected([]);
    setConfirm(null);
    setDifference(null);
    setLocalError(null);
  }
  if (state?.saved && acked !== state) {
    setAcked(state);
    setConfirm(null);
    setDifference(null);
    setAmount("");
    setReference("");
    setPaidOn(today);
    setSelected([]);
    setLocalError(null);
  }

  function go(nextEdition: string, nextTeam: string) {
    const params = new URLSearchParams();
    if (nextEdition) params.set("editionId", nextEdition);
    if (nextEdition && nextTeam) params.set("teamId", nextTeam);
    const query = params.toString();
    router.push(query ? `/admin/pagamenti/bonifico?${query}` : "/admin/pagamenti/bonifico");
  }

  function reviewTeam() {
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
    setDifference(formatTransferDifference(parsed.cents - quote.expectedCents, currency));
    setLocalError(null);
    setConfirm([
      `${it.adminBankExpected}: ${formatEuro(quote.expectedCents)} ${currency}`,
      `${it.adminBankReceived}: ${formatEuro(parsed.cents)} ${currency}`,
      `${it.adminBankReference}: ${ref}`,
      `${it.adminBankDate}: ${paidOn}`,
    ]);
  }

  function reviewMembers() {
    const parsed = parseEuroToCents(amount);
    const date = parseTransferDate(paidOn);
    const ref = parseTransferReference(reference);
    if (!parsed.ok || !date || !ref) {
      setLocalError(it.adminBankInvalid);
      setConfirm(null);
      return;
    }
    const preview = previewBankAllocation({ receivedCents: parsed.cents, people, selectedIds: selected });
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
    const chosen = people.filter((person) => selected.includes(person.registrationId));
    const lines = [
      `${it.adminBankReceived}: ${formatEuro(parsed.cents)} ${currency}`,
      `${it.adminBankUsed}: ${formatEuro(preview.usedCents)} ${currency}`,
      `${it.adminBankResidual}: ${formatSignedEuro(preview.residualCents)} ${currency}`,
      `${it.adminBankReference}: ${ref}`,
      `${it.adminBankDate}: ${paidOn}`,
      ...chosen.map(
        (person) =>
          `${person.name || it.adminBankUnnamed}: ${formatEuro(person.feeCents ?? 0)} ${currency}`,
      ),
    ];
    if (chosen.length === 0) lines.push(it.adminBankNoneSelected);
    setLocalError(null);
    setConfirm(lines);
  }

  const ready = quote?.status === "ready" ? quote : null;
  const memberMode = Boolean(teamId) && paymentMode !== "TEAM" && paymentMode !== null;
  const parsedAmount = parseEuroToCents(amount);
  const okBanner = `${fields.banner} ${fields.bannerOk}`;
  const dangerBanner = `${fields.banner} ${fields.bannerDanger}`;
  const warnBanner = `${fields.banner} ${fields.bannerWarn}`;
  const savedText =
    state?.coverage === "team"
      ? it.adminBankSavedTeam
      : state?.paymentCount
        ? it.adminBankSaved
        : it.adminBankSavedEmpty;

  return (
    <div className={styles.colMain}>
      {state?.saved ? (
        <div className={okBanner} role="status">
          <p>{savedText}</p>
          {state.transferId ? (
            <ButtonLink href={`/admin/pagamenti/bonifico/${state.transferId}`} variant="secondary">
              {it.adminBankOpen}
            </ButtonLink>
          ) : null}
        </div>
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

      {paymentMode === "TEAM" && quote?.status === "missing" ? (
        <p className={dangerBanner}>
          {it.adminBankMissing}
          {quote.names.length === 0 ? null : " " + quote.names.join(", ") + "."}
        </p>
      ) : null}
      {paymentMode === "TEAM" && quote?.status === "nothing_due" ? (
        <p className={styles.meta}>{it.adminBankNothing}</p>
      ) : null}

      {paymentMode === "TEAM" && ready ? (
        <section className={styles.sideCard}>
          <h2 className={styles.sectionTitle}>{it.adminBankTotal}</h2>
          <p className={styles.meta}>{it.adminBankTeamHelp}</p>
          <p>
            <strong>
              {formatEuro(ready.expectedCents)} {currency}
            </strong>
          </p>
          {ready.roster.length !== 0 ? (
            <ul className={styles.confirmList}>
              {ready.roster.map((person) => (
                <li key={person.registrationId}>
                  {person.name || it.adminBankUnnamed} · {roleLabel(person.category)}
                </li>
              ))}
            </ul>
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
            <AmountFields
              amount={amount}
              paidOn={paidOn}
              reference={reference}
              today={today}
              onAmount={setAmount}
              onDate={setPaidOn}
              onReference={setReference}
              onReview={reviewTeam}
            />
          )}
        </section>
      ) : null}

      {memberMode ? (
        <section className={styles.sideCard}>
          <h2 className={styles.sectionTitle}>{it.adminBankPeople}</h2>
          <p className={styles.meta}>{it.adminBankMembersHelp}</p>
          {confirm ? (
            <form action={action} className={fields.form}>
              <input type="hidden" name="editionId" value={editionId} />
              <input type="hidden" name="teamId" value={teamId} />
              <input type="hidden" name="amount" value={amount} />
              <input type="hidden" name="paidOn" value={paidOn} />
              <input type="hidden" name="reference" value={reference} />
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
                <PendingSubmitButton idle={it.adminBankConfirm} pendingLabel={it.adminBankSaving} />
                <Button type="button" variant="ghost" onClick={() => setConfirm(null)} disabled={pending}>
                  {it.adminFeesCancel}
                </Button>
              </div>
            </form>
          ) : (
            <div className={fields.form}>
              <AmountFields
                amount={amount}
                paidOn={paidOn}
                reference={reference}
                today={today}
                onAmount={setAmount}
                onDate={setPaidOn}
                onReference={setReference}
              />
              <BankTransferPeoplePicker
                people={people}
                currency={currency}
                receivedCents={parsedAmount.ok ? parsedAmount.cents : null}
                selectedIds={selected}
                onChange={(ids) => {
                  setSelected(ids);
                  setConfirm(null);
                }}
              />
              <div className={fields.actions}>
                <Button type="button" onClick={reviewMembers}>
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
                  <th>{it.adminBankUsed}</th>
                  <th>{it.adminBankResidual}</th>
                  <th>{it.adminBankDate}</th>
                  <th>{it.adminBankReference}</th>
                  <th>{it.adminBankOperator}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id}>
                    <td>{row.teamName}</td>
                    <td>{row.amountLabel}</td>
                    <td>{row.usedLabel}</td>
                    <td>{row.residualLabel}</td>
                    <td>{row.paidOn}</td>
                    <td>{row.reference}</td>
                    <td>{row.operator}</td>
                    <td>
                      <ButtonLink href={`/admin/pagamenti/bonifico/${row.id}`} variant="secondary">
                        {it.adminBankOpen}
                      </ButtonLink>
                    </td>
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

function AmountFields({
  amount,
  paidOn,
  reference,
  today,
  onAmount,
  onDate,
  onReference,
  onReview,
}: {
  amount: string;
  paidOn: string;
  reference: string;
  today: string;
  onAmount: (value: string) => void;
  onDate: (value: string) => void;
  onReference: (value: string) => void;
  onReview?: () => void;
}) {
  return (
    <>
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
            onChange={(event) => onAmount(event.target.value)}
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
            onChange={(event) => onDate(event.target.value)}
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
            onChange={(event) => onReference(event.target.value)}
            maxLength={80}
          />
        </div>
      </div>
      {onReview ? (
        <div className={fields.actions}>
          <Button type="button" onClick={onReview}>
            {it.adminBankReview}
          </Button>
        </div>
      ) : null}
    </>
  );
}
