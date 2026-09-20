"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { parseDateOnly } from "@/features/players/domain/dates";
import { guardianSchema } from "@/features/players/schemas/guardian";
import { personalDataSchema } from "@/features/players/schemas/personal";
import {
  loadPlayerWorkspace,
  persistRegistrationStatus,
  saveGuardianProfile,
  savePersonalProfile,
} from "@/features/registrations/data/workspace";
import { nextStepAfter } from "@/features/registrations/domain/wizard";
import { workspaceWriteError } from "@/features/registrations/domain/writeGate";
import { authorize } from "@/shared/authz/authorize";
import { getActorByUserId } from "@/shared/authz/getActor";
import { writeAuditLog } from "@/shared/lib/audit";
import {
  RATE_LIMITS,
  clientKey,
  consumeRateLimit,
  userAgentAndIp,
} from "@/shared/lib/request-guard";

function redirectAfterSave(intent: "continue" | "exit", current: "dati" | "tutore", checklist: Parameters<typeof nextStepAfter>[1]) {
  if (intent === "exit") redirect("/area");
  const next = nextStepAfter(current, checklist);
  redirect(next === "area" ? "/area" : `/area/registrazione/${next}`);
}

async function requireWritableRegistration() {
  const session = await auth();
  if (!session?.user?.id) redirect("/accedi?next=/area");
  const actor = await getActorByUserId(session.user.id);
  if (!actor) redirect("/accedi");
  const workspace = await loadPlayerWorkspace(session.user.id);
  if (!workspace) {
    return { error: "Non hai un’iscrizione da completare." as const, session, actor, workspace: null };
  }
  const decision = authorize(actor, "registration:write", {
    ownerUserId: session.user.id,
    teamId: workspace.registration.teamId,
  });
  if (!decision.allow) {
    return { error: "Non puoi modificare questa iscrizione." as const, session, actor, workspace: null };
  }
  const windowError = workspaceWriteError(workspace.registration);
  if (windowError) {
    return { error: windowError, session, actor, workspace: null };
  }
  return { error: undefined, session, actor, workspace };
}

export async function savePersonalDataAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
) {
  const access = await requireWritableRegistration();
  if (access.error || !access.workspace) {
    return { error: access.error ?? "Non puoi modificare questa iscrizione." };
  }

  const parsed = personalDataSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    birthDate: formData.get("birthDate"),
    fiscalCode: formData.get("fiscalCode"),
    phone: formData.get("phone"),
    intent: formData.get("intent") || "continue",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Controlla i dati inseriti." };
  }

  const rateKey = await clientKey(`profile:${access.session.user!.id}`);
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.profileWrite.limit, RATE_LIMITS.profileWrite.windowMs))) {
    return { error: "Troppe modifiche in poco tempo. Riprova più tardi." };
  }

  const birthDate = parseDateOnly(parsed.data.birthDate);
  if (!birthDate) {
    return { error: "Inserisci una data di nascita valida." };
  }

  const saved = await savePersonalProfile(access.session.user!.id, {
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    birthDate,
    fiscalCode: parsed.data.fiscalCode,
    phone: parsed.data.phone,
  });
  if (!saved.ok) {
    return { error: "Questo codice fiscale è già associato a un altro account." };
  }

  const updated = await loadPlayerWorkspace(access.session.user!.id);
  if (updated) {
    await persistRegistrationStatus(updated.registration.id, updated.projectedStatus);
  }

  const trace = await userAgentAndIp();
  await writeAuditLog({
    actorUserId: access.session.user!.id,
    action: "PROFILE_UPDATE",
    entityType: "PlayerProfile",
    entityId: access.workspace.registration.id,
    ...trace,
  });

  revalidatePath("/area");
  revalidatePath("/area/registrazione");
  redirectAfterSave(parsed.data.intent, "dati", updated?.checklist ?? access.workspace.checklist);
}

export async function saveGuardianAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
) {
  const access = await requireWritableRegistration();
  if (access.error || !access.workspace) {
    return { error: access.error ?? "Non puoi modificare questa iscrizione." };
  }
  if (!access.workspace.evidence.isMinor) {
    return { error: "Questo passo non è richiesto per il tuo profilo." };
  }

  const parsed = guardianSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    relationship: formData.get("relationship"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    intent: formData.get("intent") || "continue",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Controlla i dati inseriti." };
  }

  const rateKey = await clientKey(`guardian:${access.session.user!.id}`);
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.profileWrite.limit, RATE_LIMITS.profileWrite.windowMs))) {
    return { error: "Troppe modifiche in poco tempo. Riprova più tardi." };
  }

  const saved = await saveGuardianProfile(access.session.user!.id, {
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    relationship: parsed.data.relationship,
    email: parsed.data.email,
    phone: parsed.data.phone,
  });
  if (!saved.ok) {
    return { error: "Non è stato possibile salvare i dati del tutore." };
  }

  const updated = await loadPlayerWorkspace(access.session.user!.id);
  if (updated) {
    await persistRegistrationStatus(updated.registration.id, updated.projectedStatus);
  }

  const trace = await userAgentAndIp();
  await writeAuditLog({
    actorUserId: access.session.user!.id,
    action: "GUARDIAN_SAVE",
    entityType: "Guardian",
    entityId: access.workspace.registration.id,
    ...trace,
  });

  revalidatePath("/area");
  revalidatePath("/area/registrazione");
  redirectAfterSave(parsed.data.intent, "tutore", updated?.checklist ?? access.workspace.checklist);
}
