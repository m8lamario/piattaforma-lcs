import { Prisma } from "@generated/client";
import {
  BANK_TRANSFER_PROVIDER,
  quoteBankTransfer,
  type BankTransferCategory,
  type BankTransferQuote,
} from "@/features/payments/domain/bank-transfer";
import { centsToDecimalString, resolveParticipantFee, resolveTeamFee } from "@/features/payments/domain/fees";
import { prisma } from "@/shared/lib/prisma";

const registrationSelect = {
  id: true,
  status: true,
  category: true,
  playerProfile: { select: { userId: true, firstName: true, lastName: true } },
  payments: {
    where: { status: "SUCCEEDED" as const },
    select: { provider: true },
    orderBy: { createdAt: "desc" as const },
    take: 1,
  },
};

async function loadTeam(teamId: string) {
  return prisma.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      name: true,
      editionId: true,
      playerFeeCents: true,
      staffFeeCents: true,
      teamFeeCents: true,
      school: { select: { name: true, city: true } },
      edition: {
        select: {
          id: true,
          paymentMode: true,
          currency: true,
          playerFeeAmount: true,
          staffFeeAmount: true,
          teamFeeAmount: true,
        },
      },
      payments: {
        where: { registrationId: null, status: "SUCCEEDED" },
        select: { id: true, provider: true },
        take: 1,
      },
      registrations: {
        select: registrationSelect,
      },
    },
  });
}

function memberName(firstName: string | null, lastName: string | null) {
  return `${firstName ?? ""} ${lastName ?? ""}`.trim();
}

function quoteFromTeam(team: {
  playerFeeCents: number | null;
  staffFeeCents: number | null;
  teamFeeCents: number | null;
  edition: {
    paymentMode: "PLAYER" | "TEAM" | "BOTH";
    currency: string;
    playerFeeAmount: { toString(): string } | null;
    staffFeeAmount: { toString(): string };
    teamFeeAmount: { toString(): string } | null;
  };
  payments: { id: string }[];
  registrations: {
    id: string;
    status: string;
    category: BankTransferCategory;
    playerProfile: { userId: string; firstName: string | null; lastName: string | null };
    payments: { provider: string }[];
  }[];
}): BankTransferQuote {
  return quoteBankTransfer({
    paymentMode: team.edition.paymentMode,
    currency: team.edition.currency,
    teamCovered: team.payments.length > 0,
    teamFee: resolveTeamFee({
      paymentMode: team.edition.paymentMode,
      teamFeeCents: team.teamFeeCents,
      editionTeamFee: team.edition.teamFeeAmount,
    }),
    members: team.registrations.map((registration) => ({
      registrationId: registration.id,
      userId: registration.playerProfile.userId,
      category: registration.category,
      name: memberName(registration.playerProfile.firstName, registration.playerProfile.lastName),
      status: registration.status,
      succeededProvider: registration.payments[0]?.provider ?? null,
    })),
    feeFor: (category: BankTransferCategory) =>
      resolveParticipantFee({
        category,
        paymentMode: team.edition.paymentMode,
        teamPlayerFeeCents: team.playerFeeCents,
        teamStaffFeeCents: team.staffFeeCents,
        editionPlayerFee: team.edition.playerFeeAmount,
        editionStaffFee: team.edition.staffFeeAmount,
      }),
  });
}

export async function loadBankTransferQuote(editionId: string, teamId: string) {
  const team = await loadTeam(teamId);
  if (!team || team.editionId !== editionId) return null;
  return {
    teamId: team.id,
    teamName: team.name,
    schoolName: team.school.name,
    schoolCity: team.school.city ?? "",
    currency: team.edition.currency,
    paymentMode: team.edition.paymentMode,
    quote: quoteFromTeam(team),
  };
}

export async function listEditionTeamOptions(editionId: string) {
  const teams = await prisma.team.findMany({
    where: { editionId },
    select: { id: true, name: true, school: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  return teams
    .map((team) => ({
      id: team.id,
      label: team.school.name ? `${team.school.name} · ${team.name}` : team.name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "it"));
}

export async function listEditionBankTransfers(editionId: string) {
  return prisma.teamBankTransfer.findMany({
    where: { editionId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      amount: true,
      expectedAmount: true,
      currency: true,
      reference: true,
      paidAt: true,
      team: { select: { name: true } },
      recordedBy: { select: { name: true, email: true } },
    },
  });
}

export async function recordTeamBankTransfer(input: {
  editionId: string;
  teamId: string;
  receivedCents: number;
  reference: string;
  paidAt: Date;
  recordedByUserId: string;
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Team" WHERE id = ${input.teamId} FOR UPDATE`;
      const team = await tx.team.findUnique({
        where: { id: input.teamId },
        select: {
          id: true,
          editionId: true,
          playerFeeCents: true,
          staffFeeCents: true,
          teamFeeCents: true,
          edition: {
            select: {
              paymentMode: true,
              currency: true,
              playerFeeAmount: true,
              staffFeeAmount: true,
              teamFeeAmount: true,
            },
          },
          payments: {
            where: { registrationId: null, status: "SUCCEEDED" },
            select: { id: true },
            take: 1,
          },
          registrations: { select: registrationSelect },
        },
      });
      if (!team || team.editionId !== input.editionId) {
        return { ok: false as const, reason: "scope" as const };
      }
      const quote = quoteFromTeam(team);
      if (quote.status === "missing") return { ok: false as const, reason: "missing" as const };
      if (quote.status === "nothing_due") return { ok: false as const, reason: "nothing_due" as const };

      const transfer = await tx.teamBankTransfer.create({
        data: {
          editionId: input.editionId,
          teamId: input.teamId,
          amount: new Prisma.Decimal(centsToDecimalString(input.receivedCents)),
          expectedAmount: new Prisma.Decimal(centsToDecimalString(quote.expectedCents)),
          currency: quote.currency,
          reference: input.reference,
          paidAt: input.paidAt,
          recordedByUserId: input.recordedByUserId,
        },
      });

      const coveredUserIds = new Set<string>();
      if (quote.channel === "team") {
        await tx.payment.create({
          data: {
            editionId: input.editionId,
            teamId: input.teamId,
            amount: new Prisma.Decimal(centsToDecimalString(input.receivedCents)),
            currency: quote.currency,
            status: "SUCCEEDED",
            provider: BANK_TRANSFER_PROVIDER,
            paidAt: input.paidAt,
            recordedByUserId: input.recordedByUserId,
            bankTransferId: transfer.id,
          },
        });
        for (const registration of team.registrations) {
          if (registration.status === "WITHDRAWN" || registration.status === "REMOVED") continue;
          coveredUserIds.add(registration.playerProfile.userId);
        }
      } else {
        await tx.payment.createMany({
          data: quote.due.map((line) => ({
            editionId: input.editionId,
            teamId: input.teamId,
            registrationId: line.registrationId,
            amount: new Prisma.Decimal(centsToDecimalString(line.cents)),
            currency: quote.currency,
            status: "SUCCEEDED" as const,
            provider: BANK_TRANSFER_PROVIDER,
            paidAt: input.paidAt,
            recordedByUserId: input.recordedByUserId,
            bankTransferId: transfer.id,
          })),
        });
        for (const line of quote.due) coveredUserIds.add(line.userId);
      }

      return {
        ok: true as const,
        transferId: transfer.id,
        expectedCents: quote.expectedCents,
        receivedCents: input.receivedCents,
        coveredUserIds: [...coveredUserIds],
        paymentCount: quote.channel === "team" ? 1 : quote.due.length,
      };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false as const, reason: "duplicate" as const };
    }
    throw error;
  }
}
