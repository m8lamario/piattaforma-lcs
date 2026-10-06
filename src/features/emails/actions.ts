"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { appOrigin } from "@/shared/config/app";
import { authorize } from "@/shared/authz/authorize";
import { requireStaff } from "@/shared/authz/requireStaff";
import { fail, failValidation, type ActionFailure, type ActionState } from "@/shared/errors";
import { writeAuditLog } from "@/shared/lib/audit";
import { RATE_LIMITS, clientKey, consumeRateLimit, userAgentAndIp } from "@/shared/lib/request-guard";
import { MANUAL_TEMPLATE_KEYS } from "@/features/emails/domain/catalog";
import { isEmailTemplateKey } from "@/features/emails/domain/templates";
import { invalidTemplateVariables } from "@/features/emails/domain/variables";
import { defaultEmailTemplates, renderEmailContent } from "@/features/emails/domain/templates";
import { dispatchOutboundEmail, retryOutboundEmail } from "@/features/emails/data/dispatch";
import {
  getEmailRecipient,
  listUsersOnStaleLegalVersion,
  upsertEmailTemplateOverride,
} from "@/features/emails/data/catalog";
import { minorGuardianEmail } from "@/features/emails/data/recipients";

async function requireEmailActor(path: string, action: "email:read" | "email:send" | "email:compose") {
  const { session, actor } = await requireStaff(path);
  if (!authorize(actor, action).allow) redirect("/area");
  return { session, actor };
}

function templateVariablesFromForm(formData: FormData, email: string, firstName: string, lastName: string) {
  const areaUrl = `${appOrigin()}/area`;
  return {
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    areaUrl,
    link: String(formData.get("link") ?? areaUrl),
    scadenza: String(formData.get("scadenza") ?? ""),
    nome: firstName,
    cognome: lastName,
    email,
    nome_squadra: String(formData.get("nome_squadra") ?? ""),
  };
}

export async function previewManualEmailAction(
  _prev: ActionState<{ subject?: string; text?: string; html?: string }> | undefined,
  formData: FormData,
): Promise<ActionState<{ subject?: string; text?: string; html?: string }>> {
  const { actor } = await requireEmailActor("/admin/comunicazioni/nuova", "email:send");
  const templateKey = String(formData.get("templateKey") ?? "MANUAL");
  if (!isEmailTemplateKey(templateKey) || !MANUAL_TEMPLATE_KEYS.includes(templateKey)) {
    return failValidation();
  }
  const compose = authorize(actor, "email:compose").allow;
  const rendered = renderEmailContent({
    template: defaultEmailTemplates()[templateKey],
    variables: templateVariablesFromForm(
      formData,
      String(formData.get("email") ?? ""),
      String(formData.get("nome") ?? ""),
      String(formData.get("cognome") ?? ""),
    ),
    customSubject: compose ? String(formData.get("customSubject") ?? "") : undefined,
    customText: compose ? String(formData.get("customText") ?? "") : undefined,
  });
  return { subject: rendered.subject, text: rendered.text, html: rendered.html };
}

const sendSchema = z.object({
  userId: z.string().min(1),
  templateKey: z.string(),
  confirm: z.literal("on"),
  copyGuardian: z.string().optional(),
  title: z.string().optional(),
  body: z.string().optional(),
  link: z.string().optional(),
  scadenza: z.string().optional(),
  customSubject: z.string().optional(),
  customText: z.string().optional(),
  idempotencyKey: z.string().min(8),
});

export async function sendManualEmailAction(
  _prev: ActionState<{ messageId?: string }> | undefined,
  formData: FormData,
): Promise<ActionState<{ messageId?: string }>> {
  const { session, actor } = await requireEmailActor("/admin/comunicazioni/nuova", "email:send");
  if (String(formData.get("confirm")) !== "on") return fail("EMAIL_CONFIRM_REQUIRED");
  const parsed = sendSchema.safeParse({
    userId: formData.get("userId"),
    templateKey: formData.get("templateKey"),
    confirm: formData.get("confirm"),
    copyGuardian: formData.get("copyGuardian") || undefined,
    title: formData.get("title") || undefined,
    body: formData.get("body") || undefined,
    link: formData.get("link") || undefined,
    scadenza: formData.get("scadenza") || undefined,
    customSubject: formData.get("customSubject") || undefined,
    customText: formData.get("customText") || undefined,
    idempotencyKey: formData.get("idempotencyKey"),
  });
  if (!parsed.success) return failValidation();
  if (!isEmailTemplateKey(parsed.data.templateKey) || !MANUAL_TEMPLATE_KEYS.includes(parsed.data.templateKey)) {
    return fail("EMAIL_TEMPLATE_INVALID");
  }
  const compose = authorize(actor, "email:compose").allow;
  const rateKey = await clientKey(`email-send:${session.user.id}`);
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.emailSend.limit, RATE_LIMITS.emailSend.windowMs))) {
    return fail("RATE_LIMITED");
  }
  const recipient = await getEmailRecipient(parsed.data.userId);
  if (!recipient) return fail("RESOURCE_NOT_FOUND");
  const variables = templateVariablesFromForm(
    formData,
    recipient.email,
    recipient.playerProfile?.firstName ?? "",
    recipient.playerProfile?.lastName ?? "",
  );
  const result = await dispatchOutboundEmail({
    idempotencyKey: `${parsed.data.idempotencyKey}:user`,
    purpose: parsed.data.templateKey,
    templateKey: parsed.data.templateKey,
    to: recipient.email,
    userId: recipient.id,
    recipientKind: "USER",
    variables,
    actorUserId: session.user.id,
    sourceEntityType: "User",
    sourceEntityId: recipient.id,
    customSubject: compose ? parsed.data.customSubject : undefined,
    customText: compose ? parsed.data.customText : undefined,
  });
  const guardian = await minorGuardianEmail(recipient.id);
  if (parsed.data.copyGuardian === "on" && guardian && guardian !== recipient.email.toLowerCase()) {
    await dispatchOutboundEmail({
      idempotencyKey: `${parsed.data.idempotencyKey}:guardian`,
      purpose: parsed.data.templateKey,
      templateKey: parsed.data.templateKey,
      to: guardian,
      userId: recipient.id,
      recipientKind: "GUARDIAN",
      variables,
      actorUserId: session.user.id,
      sourceEntityType: "User",
      sourceEntityId: recipient.id,
      customSubject: compose ? parsed.data.customSubject : undefined,
      customText: compose ? parsed.data.customText : undefined,
    });
  }
  const trace = await userAgentAndIp();
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "EMAIL_SEND",
    entityType: "EmailMessage",
    entityId: result.id,
    metadata: { purpose: parsed.data.templateKey, templateKey: parsed.data.templateKey },
    ...trace,
  });
  revalidatePath("/admin/comunicazioni");
  return { messageId: result.id };
}

export async function retryEmailAction(
  _prev: ActionFailure | undefined,
  formData: FormData,
): Promise<ActionFailure | { ok: true; id: string }> {
  const { session } = await requireEmailActor("/admin/comunicazioni", "email:send");
  const id = String(formData.get("id") ?? "");
  if (!id) return fail("EMAIL_NOT_FOUND");
  const result = await retryOutboundEmail(id);
  if (!result) return fail("EMAIL_NOT_FOUND");
  if ("retryable" in result && result.retryable === false) return fail("EMAIL_RETRY_NOT_ALLOWED");
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "EMAIL_RETRY",
    entityType: "EmailMessage",
    entityId: result.id,
    metadata: { status: result.status },
  });
  revalidatePath(`/admin/comunicazioni/${result.id}`);
  revalidatePath("/admin/comunicazioni");
  return { ok: true as const, id: result.id };
}

export async function saveEmailTemplateAction(
  _prev: ActionFailure | undefined,
  formData: FormData,
): Promise<ActionFailure | { ok: true }> {
  const { session } = await requireEmailActor("/admin/comunicazioni/template", "email:compose");
  const key = String(formData.get("key") ?? "");
  const subject = String(formData.get("subject") ?? "");
  const textBody = String(formData.get("textBody") ?? "");
  if (!isEmailTemplateKey(key)) return fail("EMAIL_TEMPLATE_INVALID");
  const invalid = [...invalidTemplateVariables(subject), ...invalidTemplateVariables(textBody)];
  if (invalid.length > 0) return fail("EMAIL_TEMPLATE_INVALID");
  await upsertEmailTemplateOverride({
    key,
    subject,
    textBody,
    updatedById: session.user.id,
  });
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "EMAIL_TEMPLATE_UPDATE",
    entityType: "EmailTemplateOverride",
    entityId: key,
  });
  revalidatePath("/admin/comunicazioni/template");
  return { ok: true };
}

export async function notifyStaleLegalVersionAction(
  _prev: ActionState<{ sent?: number; failed?: number; total?: number }> | undefined,
  formData: FormData,
): Promise<ActionState<{ sent?: number; failed?: number; total?: number }>> {
  const { session } = await requireEmailActor("/admin/informative", "email:send");
  const slug = String(formData.get("slug") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (confirm.trim().toUpperCase() !== "AVVISA") return fail("EMAIL_CONFIRM_REQUIRED");
  const { current, users } = await listUsersOnStaleLegalVersion(slug);
  if (!current) return fail("RESOURCE_NOT_FOUND");
  const areaUrl = `${appOrigin()}/area`;
  let sent = 0;
  let failed = 0;
  for (const user of users) {
    const result = await dispatchOutboundEmail({
      idempotencyKey: `legal:${current.id}:${user.userId}`,
      purpose: "LEGAL_VERSION_NOTICE",
      templateKey: "LEGAL_VERSION_NOTICE",
      to: user.email,
      userId: user.userId,
      recipientKind: "USER",
      variables: { areaUrl, link: areaUrl },
      sourceEntityType: "LegalDocumentVersion",
      sourceEntityId: current.id,
      actorUserId: session.user.id,
    });
    if (result.status === "FAILED") failed += 1;
    else if (!result.skipped) sent += 1;
    const guardian = await minorGuardianEmail(user.userId);
    if (guardian && guardian !== user.email.toLowerCase()) {
      await dispatchOutboundEmail({
        idempotencyKey: `legal:${current.id}:${user.userId}:guardian`,
        purpose: "LEGAL_VERSION_NOTICE",
        templateKey: "LEGAL_VERSION_NOTICE",
        to: guardian,
        userId: user.userId,
        recipientKind: "GUARDIAN",
        variables: { areaUrl, link: areaUrl },
        sourceEntityType: "LegalDocumentVersion",
        sourceEntityId: current.id,
        actorUserId: session.user.id,
      });
    }
  }
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "EMAIL_SEND",
    entityType: "LegalDocument",
    entityId: slug,
    metadata: { kind: "LEGAL_VERSION_NOTICE", sent, failed, recipients: users.length },
  });
  revalidatePath("/admin/comunicazioni");
  revalidatePath("/admin/informative");
  return { sent, failed, total: users.length };
}
