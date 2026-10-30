import { Prisma } from "@generated/client";
import {
  BANK_TRANSFER_PROVIDER,
  describeBankAllocationPerson,
  previewBankAllocation,
  quoteBankTransfer,
  uncoveredFeeCents,
  type BankAllocationPerson,
  type BankTransferCategory,
  type BankTransferQuote,
} from "@/features/payments/domain/bank-transfer";
import {
  centsToDecimalString,
  decimalToCents,
  resolveParticipantFee,
  resolveTeamFee,
} from "@/features/payments/domain/fees";
import { prisma } from "@/shared/lib/prisma";

const registrationSelect = {
  id: true,
  status: true,
  category: true,
  playerProfile: {
    select: {
      userId: true,
      firstName: true,
      lastName: true,
      user: { select: { email: true } },
    },
  },
  payments: {
    where: { status: "SUCCEEDED" as const },
    select: { provider: true, amount: true, bankTransferId: true },
    orderBy: { createdAt: "desc" as const },
  },
};

type FeeDb = Prisma.TransactionClient | typeof prisma;

async function loadTeam(db: FeeDb, teamId: string) {
  return db.team.findUnique({
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
          name: true,
          paymentMode: true,
          currency: true,
          playerFeeAmount: true,
          staffFeeAmount: true,
          teamFeeAmount: true,
          competition: { select: { name: true } },
        },
      },
      payments: {
        where: { registrationId: null, status: "SUCCEEDED" as const },
        select: { id: true, provider: true, amount: true, bankTransferId: true },
      },
      registrations: {
        select: registrationSelect,
      },
    },
  });
}

type LoadedTeam = NonNullable<Awaited<ReturnType<typeof loadTeam>>>;

function memberName(firstName: string | null, lastName: string | null) {
  return `${firstName ?? ""} ${lastName ?? ""}`.trim();
}

function quoteFromTeam(team: LoadedTeam): BankTransferQuote {
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

function peopleFromTeam(team: LoadedTeam, transferId: string | null): BankAllocationPerson[] {
  return team.registrations.map((registration) => {
    const own = transferId
      ? registration.payments.filter((payment) => payment.bankTransferId === transferId)
      : [];
    const other = registration.payments.find(
      (payment) => transferId == null || payment.bankTransferId !== transferId,
    );
    return describeBankAllocationPerson({
      registrationId: registration.id,
      userId: registration.playerProfile.userId,
      name: memberName(registration.playerProfile.firstName, registration.playerProfile.lastName),
      email: registration.playerProfile.user.email,
      category: registration.category,
      registrationStatus: registration.status,
      fee: resolveParticipantFee({
        category: registration.category,
        paymentMode: team.edition.paymentMode,
        teamPlayerFeeCents: team.playerFeeCents,
        teamStaffFeeCents: team.staffFeeCents,
        editionPlayerFee: team.edition.playerFeeAmount,
        editionStaffFee: team.edition.staffFeeAmount,
      }),
      linkedCents: own.length
        ? own.reduce((sum, payment) => sum + (decimalToCents(payment.amount) ?? 0), 0)
        : null,
      otherProvider: other?.provider ?? null,
    });
  });
}

function memberPayments(input: {
  people: readonly BankAllocationPerson[];
  registrationIds: readonly string[];
  editionId: string;
  teamId: string;
  transferId: string;
  currency: string;
  paidAt: Date;
  recordedByUserId: string;
}) {
  const byId = new Map(input.people.map((person) => [person.registrationId, person]));
  return input.registrationIds.map((registrationId) => {
    const person = byId.get(registrationId);
    if (!person || person.feeCents == null) throw new Error("allocation_fee_missing");
    return {
      editionId: input.editionId,
      teamId: input.teamId,
      registrationId,
      amount: new Prisma.Decimal(centsToDecimalString(person.feeCents)),
      currency: input.currency,
      status: "SUCCEEDED" as const,
      provider: BANK_TRANSFER_PROVIDER,
      paidAt: input.paidAt,
      recordedByUserId: input.recordedByUserId,
      bankTransferId: input.transferId,
    };
  });
}

export async function loadBankTransferQuote(editionId: string, teamId: string) {
  const team = await loadTeam(prisma, teamId);
  if (!team || team.editionId !== editionId) return null;
  return {
    teamId: team.id,
    teamName: team.name,
    schoolName: team.school.name,
    schoolCity: team.school.city ?? "",
    currency: team.edition.currency,
    paymentMode: team.edition.paymentMode,
    quote: quoteFromTeam(team),
    people: peopleFromTeam(team, null),
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
  const rows = await prisma.teamBankTransfer.findMany({
    where: { editionId },
    orderBy: { paidAt: "desc" },
    take: 100,
    select: {
      id: true,
      amount: true,
      expectedAmount: true,
      currency: true,
      reference: true,
      paidAt: true,
      team: { select: { name: true } },
      edition: { select: { paymentMode: true } },
      recordedBy: { select: { name: true, email: true } },
      payments: {
        where: { status: "SUCCEEDED" },
        select: { amount: true, registrationId: true },
      },
    },
  });

  return rows.map((row) => {
    const receivedCents = decimalToCents(row.amount) ?? 0;
    const teamPayment = row.payments.find((payment) => payment.registrationId == null);
    const channel = row.edition.paymentMode === "TEAM" || teamPayment ? ("team" as const) : ("members" as const);
    const usedCents =
      channel === "team"
        ? teamPayment
          ? (decimalToCents(teamPayment.amount) ?? receivedCents)
          : receivedCents
        : row.payments.reduce((sum, payment) => sum + (decimalToCents(payment.amount) ?? 0), 0);
    return {
      id: row.id,
      teamName: row.team.name,
      amount: row.amount,
      expectedAmount: row.expectedAmount,
      currency: row.currency,
      reference: row.reference,
      paidAt: row.paidAt,
      operatorName: row.recordedBy.name,
      operatorEmail: row.recordedBy.email,
      channel,
      receivedCents,
      usedCents,
      residualCents: receivedCents - usedCents,
    };
  });
}

export async function loadBankTransferDetail(transferId: string) {
  const transfer = await prisma.teamBankTransfer.findUnique({
    where: { id: transferId },
    select: {
      id: true,
      editionId: true,
      teamId: true,
      amount: true,
      expectedAmount: true,
      currency: true,
      reference: true,
      paidAt: true,
      recordedBy: { select: { name: true, email: true } },
      payments: {
        where: { status: "SUCCEEDED" },
        select: { registrationId: true, amount: true },
      },
    },
  });
  if (!transfer) return null;
  const team = await loadTeam(prisma, transfer.teamId);
  if (!team || team.editionId !== transfer.editionId) return null;
  const people = peopleFromTeam(team, transfer.id);
  const receivedCents = decimalToCents(transfer.amount) ?? 0;
  const teamPayment = transfer.payments.find((payment) => payment.registrationId == null);
  const channel = team.edition.paymentMode === "TEAM" || teamPayment ? "team" : "members";
  const usedCents =
    channel === "team"
      ? teamPayment
        ? (decimalToCents(teamPayment.amount) ?? receivedCents)
        : receivedCents
      : people.reduce((sum, person) => sum + (person.linkedCents ?? 0), 0);
  return {
    id: transfer.id,
    editionId: transfer.editionId,
    teamId: transfer.teamId,
    teamName: team.name,
    schoolName: team.school.name,
    editionLabel: `${team.edition.competition.name} · ${team.edition.name}`,
    reference: transfer.reference,
    paidAt: transfer.paidAt,
    currency: transfer.currency,
    operator: transfer.recordedBy.name?.trim() || transfer.recordedBy.email,
    channel,
    receivedCents,
    expectedCents: decimalToCents(transfer.expectedAmount) ?? 0,
    usedCents,
    residualCents: receivedCents - usedCents,
    people,
  };
}

export async function recordTeamBankTransfer(input: {
  editionId: string;
  teamId: string;
  receivedCents: number;
  reference: string;
  paidAt: Date;
  recordedByUserId: string;
  registrationIds: string[];
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Team" WHERE id = ${input.teamId} FOR UPDATE`;
      const team = await loadTeam(tx, input.teamId);
      if (!team || team.editionId !== input.editionId) {
        return { ok: false as const, reason: "scope" as const };
      }

      if (team.edition.paymentMode === "TEAM") {
        const quote = quoteFromTeam(team);
        if (quote.status === "missing") return { ok: false as const, reason: "missing" as const };
        if (quote.status !== "ready") return { ok: false as const, reason: "nothing_due" as const };
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
        const coveredUserIds = team.registrations
          .filter((registration) => registration.status !== "WITHDRAWN" && registration.status !== "REMOVED")
          .map((registration) => registration.playerProfile.userId);
        return {
          ok: true as const,
          transferId: transfer.id,
          expectedCents: quote.expectedCents,
          receivedCents: input.receivedCents,
          coveredUserIds,
          paymentCount: 1,
          coverage: "team" as const,
        };
      }

      const people = peopleFromTeam(team, null);
      const preview = previewBankAllocation({
        receivedCents: input.receivedCents,
        people,
        selectedIds: input.registrationIds,
      });
      if (preview.reason) return { ok: false as const, reason: preview.reason };
      const uncovered = uncoveredFeeCents(people);
      const expectedCents = uncovered > 0 ? uncovered : input.receivedCents;
      const transfer = await tx.teamBankTransfer.create({
        data: {
          editionId: input.editionId,
          teamId: input.teamId,
          amount: new Prisma.Decimal(centsToDecimalString(input.receivedCents)),
          expectedAmount: new Prisma.Decimal(centsToDecimalString(expectedCents)),
          currency: team.edition.currency,
          reference: input.reference,
          paidAt: input.paidAt,
          recordedByUserId: input.recordedByUserId,
        },
      });
      if (preview.addIds.length > 0) {
        await tx.payment.createMany({
          data: memberPayments({
            people,
            registrationIds: preview.addIds,
            editionId: input.editionId,
            teamId: input.teamId,
            transferId: transfer.id,
            currency: team.edition.currency,
            paidAt: input.paidAt,
            recordedByUserId: input.recordedByUserId,
          }),
        });
      }
      return {
        ok: true as const,
        transferId: transfer.id,
        expectedCents,
        receivedCents: input.receivedCents,
        coveredUserIds: preview.addIds.flatMap((id) => {
          const person = people.find((item) => item.registrationId === id);
          return person ? [person.userId] : [];
        }),
        paymentCount: preview.addIds.length,
        coverage: "members" as const,
      };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(",")
        : String(error.meta?.target ?? "");
      if (target.includes("reference") || target.includes("TeamBankTransfer")) {
        return { ok: false as const, reason: "duplicate" as const };
      }
      return { ok: false as const, reason: "paid_elsewhere" as const };
    }
    throw error;
  }
}

export async function updateTeamBankTransferPeople(input: {
  transferId: string;
  registrationIds: string[];
  recordedByUserId: string;
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      const transfer = await tx.teamBankTransfer.findUnique({
        where: { id: input.transferId },
        select: {
          id: true,
          teamId: true,
          editionId: true,
          amount: true,
          currency: true,
          paidAt: true,
          payments: { where: { status: "SUCCEEDED" }, select: { registrationId: true } },
        },
      });
      if (!transfer) return { ok: false as const, reason: "missing_transfer" as const };
      await tx.$queryRaw`SELECT id FROM "Team" WHERE id = ${transfer.teamId} FOR UPDATE`;
      const team = await loadTeam(tx, transfer.teamId);
      if (!team || team.editionId !== transfer.editionId) {
        return { ok: false as const, reason: "scope" as const };
      }
      const teamChannel =
        team.edition.paymentMode === "TEAM" || transfer.payments.some((payment) => payment.registrationId == null);
      if (teamChannel) return { ok: false as const, reason: "team_channel" as const };

      const people = peopleFromTeam(team, transfer.id);
      const receivedCents = decimalToCents(transfer.amount);
      if (receivedCents == null) return { ok: false as const, reason: "missing" as const };
      const preview = previewBankAllocation({
        receivedCents,
        people,
        selectedIds: input.registrationIds,
      });
      if (preview.reason) return { ok: false as const, reason: preview.reason };
      if (preview.addIds.length === 0 && preview.removeIds.length === 0) {
        return { ok: true as const, changed: false as const };
      }

      if (preview.removeIds.length > 0) {
        const found = await tx.payment.findMany({
          where: {
            bankTransferId: transfer.id,
            provider: BANK_TRANSFER_PROVIDER,
            status: "SUCCEEDED",
            registrationId: { in: preview.removeIds },
          },
          select: { registrationId: true },
        });
        const foundIds = new Set(found.map((payment) => payment.registrationId));
        if (preview.removeIds.some((id) => !foundIds.has(id))) {
          return { ok: false as const, reason: "conflict" as const };
        }
        await tx.payment.deleteMany({
          where: {
            bankTransferId: transfer.id,
            provider: BANK_TRANSFER_PROVIDER,
            status: "SUCCEEDED",
            registrationId: { in: preview.removeIds },
          },
        });
      }

      if (preview.addIds.length > 0) {
        await tx.payment.createMany({
          data: memberPayments({
            people,
            registrationIds: preview.addIds,
            editionId: transfer.editionId,
            teamId: transfer.teamId,
            transferId: transfer.id,
            currency: transfer.currency,
            paidAt: transfer.paidAt,
            recordedByUserId: input.recordedByUserId,
          }),
        });
      }

      const touched = new Set([...preview.addIds, ...preview.removeIds]);
      return {
        ok: true as const,
        changed: true as const,
        transferId: transfer.id,
        editionId: transfer.editionId,
        teamId: transfer.teamId,
        coveredUserIds: people.filter((person) => touched.has(person.registrationId)).map((person) => person.userId),
        added: preview.addIds.length,
        removed: preview.removeIds.length,
        usedCents: preview.usedCents,
        residualCents: preview.residualCents,
      };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false as const, reason: "paid_elsewhere" as const };
    }
    throw error;
  }
}
