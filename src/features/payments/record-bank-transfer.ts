"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { recordTeamBankTransfer } from "@/features/payments/data/bank-transfer";
import {
  parseTransferAmount,
  parseTransferDate,
  parseTransferReference,
} from "@/features/payments/domain/bank-transfer";
import { parseEuroToCents } from "@/features/payments/domain/fees";
import { loadPlayerWorkspace, persistRegistrationStatus } from "@/features/registrations/data/workspace";
import { authorize } from "@/shared/authz/authorize";
import { getActorByUserId } from "@/shared/authz/getActor";
import { fail, type ActionState } from "@/shared/errors";
import { writeAuditLog } from "@/shared/lib/audit";
import { logger } from "@/shared/lib/logger";
import { userAgentAndIp } from "@/shared/lib/request-guard";
import { it } from "@/shared/i18n/it";

export async function recordTeamBankTransferAction(
  _prev: ActionState<{ saved?: boolean }> | undefined,
  formData: FormData,
): Promise<ActionState<{ saved?: boolean }>> {
  const session = await auth();
  if (!session?.user?.id) return fail("AUTH_SESSION_REQUIRED");
  const actor = await getActorByUserId(session.user.id);
  if (!actor || !authorize(actor, "payment:record_transfer").allow) return fail("FORBIDDEN_RESOURCE");
  if (formData.get("confirm") !== "yes") return fail("VALIDATION_INVALID_INPUT");

  const editionId = String(formData.get("editionId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  const reference = parseTransferReference(String(formData.get("reference") ?? ""));
  const paidAt = parseTransferDate(String(formData.get("paidOn") ?? ""));
  const amount = parseEuroToCents(String(formData.get("amount") ?? ""));
  if (!editionId || !teamId || !reference || !paidAt || !amount.ok || !parseTransferAmount(amount.cents)) {
    return fail("VALIDATION_INVALID_INPUT", it.adminBankInvalid);
  }

  const saved = await recordTeamBankTransfer({
    editionId,
    teamId,
    receivedCents: amount.cents,
    reference,
    paidAt,
    recordedByUserId: session.user.id,
  });
  if (!saved.ok) {
    if (saved.reason === "scope") return fail("PAYMENT_SCOPE_MISMATCH");
    if (saved.reason === "missing") return fail("PAYMENT_FEE_MISSING");
    if (saved.reason === "duplicate") return fail("PAYMENT_BANK_DUPLICATE");
    return fail("PAYMENT_BANK_NOTHING_DUE");
  }

  for (const userId of saved.coveredUserIds) {
    try {
      const workspace = await loadPlayerWorkspace(userId);
      if (workspace) await persistRegistrationStatus(workspace.registration.id, workspace.projectedStatus);
    } catch {
      logger.error("bank_transfer.status_failed", { userId });
    }
  }

  const trace = await userAgentAndIp();
  await writeAuditLog({
    actorUserId: session.user.id,
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

  revalidatePath("/admin/pagamenti");
  revalidatePath("/admin/pagamenti/bonifico");
  revalidatePath(`/admin/edizioni/${editionId}`);
  revalidatePath("/area");
  revalidatePath("/squadra");

  return { saved: true };
}
