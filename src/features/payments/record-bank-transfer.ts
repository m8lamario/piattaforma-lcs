"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { recordTeamBankTransfer, updateTeamBankTransferPeople } from "@/features/payments/data/bank-transfer";
import {
  parseTransferAmount,
  parseTransferDate,
  parseTransferReference,
} from "@/features/payments/domain/bank-transfer";
import { parseEuroToCents } from "@/features/payments/domain/fees";
import { loadPlayerWorkspace, persistRegistrationStatus } from "@/features/registrations/data/workspace";
import { authorize } from "@/shared/authz/authorize";
import { getActorByUserId } from "@/shared/authz/getActor";
import { fail, failValidation, type ActionState } from "@/shared/errors";
import { writeAuditLog } from "@/shared/lib/audit";
import { logger } from "@/shared/lib/logger";
import { userAgentAndIp } from "@/shared/lib/request-guard";
import { it } from "@/shared/i18n/it";

type BankActionState = ActionState<{
  saved?: boolean;
  paymentCount?: number;
  transferId?: string;
  coverage?: "team" | "members";
}>;

function registrationIds(formData: FormData) {
  return [
    ...new Set(
      formData
        .getAll("registrationId")
        .map((value) => String(value).trim())
        .filter(Boolean),
    ),
  ];
}

async function requireTransferActor() {
  const session = await auth();
  if (!session?.user?.id) return fail("AUTH_SESSION_REQUIRED");
  const actor = await getActorByUserId(session.user.id);
  if (!actor || !authorize(actor, "payment:record_transfer").allow) return fail("FORBIDDEN_RESOURCE");
  return { userId: session.user.id };
}

function allocationFailure(reason: string) {
  if (reason === "scope" || reason === "unknown") return fail("PAYMENT_SCOPE_MISMATCH");
  if (reason === "missing" || reason === "fee_missing") return fail("PAYMENT_FEE_MISSING");
  if (reason === "duplicate") return fail("PAYMENT_BANK_DUPLICATE");
  if (reason === "nothing_due") return fail("PAYMENT_BANK_NOTHING_DUE");
  if (reason === "insufficient") return fail("PAYMENT_BANK_INSUFFICIENT");
  if (reason === "paid_elsewhere") return fail("PAYMENT_ALREADY_COMPLETED");
  if (reason === "missing_transfer") return fail("PAYMENT_NOT_FOUND");
  if (reason === "conflict") return failValidation(it.adminBankConflict);
  if (reason === "inactive" || reason === "not_due" || reason === "team_channel") {
    return failValidation(it.adminBankInvalidSelection);
  }
  return failValidation(it.adminBankInvalid);
}

async function refreshRegistrationStatus(userIds: readonly string[]) {
  for (const userId of userIds) {
    try {
      const workspace = await loadPlayerWorkspace(userId);
      if (workspace) await persistRegistrationStatus(workspace.registration.id, workspace.projectedStatus);
    } catch {
      logger.error("bank_transfer.status_failed", { userId });
    }
  }
}

function revalidateBankPaths(editionId: string, transferId?: string) {
  revalidatePath("/admin/pagamenti");
  revalidatePath("/admin/pagamenti/bonifico");
  if (transferId) revalidatePath(`/admin/pagamenti/bonifico/${transferId}`);
  revalidatePath(`/admin/edizioni/${editionId}`);
  revalidatePath("/area");
  revalidatePath("/squadra");
}

export async function recordTeamBankTransferAction(
  _prev: BankActionState | undefined,
  formData: FormData,
): Promise<BankActionState> {
  const access = await requireTransferActor();
  if (!("userId" in access)) return access;
  if (formData.get("confirm") !== "yes") return failValidation(it.adminBankInvalid);

  const editionId = String(formData.get("editionId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  const reference = parseTransferReference(String(formData.get("reference") ?? ""));
  const paidAt = parseTransferDate(String(formData.get("paidOn") ?? ""));
  const amount = parseEuroToCents(String(formData.get("amount") ?? ""));
  if (!editionId || !teamId || !reference || !paidAt || !amount.ok || !parseTransferAmount(amount.cents)) {
    return failValidation(it.adminBankInvalid);
  }

  const saved = await recordTeamBankTransfer({
    editionId,
    teamId,
    receivedCents: amount.cents,
    reference,
    paidAt,
    recordedByUserId: access.userId,
    registrationIds: registrationIds(formData),
  });
  if (!saved.ok) return allocationFailure(saved.reason);

  await refreshRegistrationStatus(saved.coveredUserIds);

  const trace = await userAgentAndIp();
  await writeAuditLog({
    actorUserId: access.userId,
    actorRole: "SUPER_ADMIN",
    action: "TEAM_BANK_TRANSFER_RECORD",
    entityType: "TeamBankTransfer",
    entityId: saved.transferId,
    metadata: {
      editionId,
      teamId,
      reference,
      receivedCents: saved.receivedCents,
      expectedCents: saved.expectedCents,
      paymentCount: saved.paymentCount,
    },
    ...trace,
  });

  revalidateBankPaths(editionId, saved.transferId);
  return {
    saved: true,
    paymentCount: saved.paymentCount,
    transferId: saved.transferId,
    coverage: saved.coverage,
  };
}

export async function updateTeamBankTransferPeopleAction(
  _prev: BankActionState | undefined,
  formData: FormData,
): Promise<BankActionState> {
  const access = await requireTransferActor();
  if (!("userId" in access)) return access;
  if (formData.get("confirm") !== "yes") return failValidation(it.adminBankInvalid);

  const transferId = String(formData.get("transferId") ?? "");
  if (!transferId) return fail("PAYMENT_NOT_FOUND");

  const saved = await updateTeamBankTransferPeople({
    transferId,
    registrationIds: registrationIds(formData),
    recordedByUserId: access.userId,
  });
  if (!saved.ok) return allocationFailure(saved.reason);
  if (!saved.changed) return failValidation(it.adminBankNoChange);

  await refreshRegistrationStatus(saved.coveredUserIds);

  const trace = await userAgentAndIp();
  await writeAuditLog({
    actorUserId: access.userId,
    actorRole: "SUPER_ADMIN",
    action: "TEAM_BANK_TRANSFER_ALLOCATE",
    entityType: "TeamBankTransfer",
    entityId: saved.transferId,
    metadata: {
      editionId: saved.editionId,
      teamId: saved.teamId,
      added: saved.added,
      removed: saved.removed,
      usedCents: saved.usedCents,
      residualCents: saved.residualCents,
    },
    ...trace,
  });

  revalidateBankPaths(saved.editionId, saved.transferId);
  return { saved: true, transferId: saved.transferId };
}
