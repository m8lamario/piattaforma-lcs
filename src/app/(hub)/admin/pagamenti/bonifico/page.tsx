import { redirect } from "next/navigation";
import { listCompetitionsWithEditions } from "@/features/admin/data/catalog";
import { listEditionBankTransfers, listEditionTeamOptions, loadBankTransferQuote } from "@/features/payments/data/bank-transfer";
import { decimalToCents, formatEuro, formatSignedEuro } from "@/features/payments/domain/fees";
import { paymentDateLabel } from "@/features/payments/domain/export";
import { BankTransferForm } from "@/features/admin/ui/BankTransferForm";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { isSuperAdmin } from "@/shared/authz/getActor";
import { requireStaff } from "@/shared/authz/requireStaff";
import { ButtonLink } from "@/shared/ui/Button";
import { PageHeader } from "@/shared/ui/PageHeader";
import { it } from "@/shared/i18n/it";

type Props = { searchParams: Promise<{ editionId?: string; teamId?: string }> };

function money(amount: { toString(): string }, currency: string) {
  const cents = decimalToCents(amount);
  return cents === null ? amount.toString() : `${formatEuro(cents)} ${currency}`;
}

export default async function AdminBankTransferPage({ searchParams }: Props) {
  const [{ actor }, params, competitions] = await Promise.all([
    requireStaff("/admin/pagamenti/bonifico"),
    searchParams,
    listCompetitionsWithEditions(),
  ]);
  if (!isSuperAdmin(actor)) redirect("/admin/pagamenti");

  const editions = competitions.flatMap((competition) =>
    competition.editions.map((edition) => ({
      id: edition.id,
      label: `${competition.name} · ${edition.name}`,
    })),
  );
  const editionId = editions.some((edition) => edition.id === params.editionId) ? params.editionId ?? "" : "";
  const teams = editionId ? await listEditionTeamOptions(editionId) : [];
  const teamId = teams.some((team) => team.id === params.teamId) ? params.teamId ?? "" : "";
  const [loaded, history] = await Promise.all([
    editionId && teamId ? loadBankTransferQuote(editionId, teamId) : Promise.resolve(null),
    editionId ? listEditionBankTransfers(editionId) : Promise.resolve([]),
  ]);

  return (
    <AdminFrame path="/admin/pagamenti" actor={actor}>
      <PageHeader
        title={it.adminBankTitle}
        description={it.adminBankHelp}
        aside={
          <ButtonLink href="/admin/pagamenti" variant="secondary">
            {it.adminBankBack}
          </ButtonLink>
        }
      />
      <BankTransferForm
        editions={editions}
        teams={teams}
        editionId={editionId}
        teamId={teamId}
        currency={loaded?.currency ?? "EUR"}
        paymentMode={loaded?.paymentMode ?? null}
        people={loaded?.people ?? []}
        quote={loaded?.quote ?? null}
        today={new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date())}
        history={history.map((row) => ({
          id: row.id,
          teamName: row.teamName,
          amountLabel: money(row.amount, row.currency),
          usedLabel:
            row.channel === "team"
              ? it.adminBankTeamCoverage
              : `${formatEuro(row.usedCents)} ${row.currency}`,
          residualLabel:
            row.channel === "team" ? "—" : `${formatSignedEuro(row.residualCents)} ${row.currency}`,
          reference: row.reference,
          paidOn: paymentDateLabel(row.paidAt),
          operator: row.operatorName?.trim() || row.operatorEmail,
        }))}
      />
    </AdminFrame>
  );
}
