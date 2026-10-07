"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { authorize } from "@/shared/authz/authorize";
import { getActorByUserId } from "@/shared/authz/getActor";
import { dispatchOutboundEmail } from "@/features/emails/data/dispatch";
import {
  activateSchoolAccessAccount,
  approveSchoolAccessRequest,
  createSchoolAccessRequest,
  findSchoolAccessByActivationToken,
  inspectSchoolAccessActivation,
  issueActivationToken,
  rejectSchoolAccessRequest,
} from "@/features/school-access/data/requests";
import { notifyStaffOfSchoolAccessRequest } from "@/features/school-access/data/notify";
import { activationErrorCode } from "@/features/school-access/domain/activation";
import {
  activateSchoolAccessSchema,
  rejectSchoolAccessSchema,
  schoolAccessRequestSchema,
} from "@/features/school-access/schemas/request";
import { writeAuditLog } from "@/shared/lib/audit";
import { RATE_LIMITS, clientKey, consumeRateLimit, userAgentAndIp } from "@/shared/lib/request-guard";
import { isWellFormedInviteToken } from "@/features/teams/domain/token";
import { deliverEmailVerification } from "@/features/auth/data/emailVerification";
import { emailVerificationPath } from "@/features/auth/domain/verify";
import { fail, failValidation, type ActionFailure } from "@/shared/errors";
import { it } from "@/shared/i18n/it";

function originFromHeaders(headerList: Headers) {
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return process.env.AUTH_URL ?? "http://localhost:3000";
}

function formatExpiry(value: Date) {
  return value.toLocaleString("it-IT", { dateStyle: "long", timeStyle: "short" });
}

async function requireAdminActor() {
  const session = await auth();
  if (!session?.user?.id) redirect("/accedi?next=/admin/richieste");
  const actor = await getActorByUserId(session.user.id);
  if (!actor || !authorize(actor, "admin:manage").allow) redirect("/area");
  return { session, actor };
}

export async function submitSchoolAccessAction(_prev: ActionFailure | undefined, formData: FormData) {
  const parsed = schoolAccessRequestSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    schoolName: formData.get("schoolName"),
    city: formData.get("city"),
    requesterRole: formData.get("requesterRole"),
    institutionalEmail: formData.get("institutionalEmail") ?? "",
    editionId: formData.get("editionId"),
  });
  if (!parsed.success) {
    return failValidation(parsed.error.issues[0]?.message);
  }

  const rateKey = await clientKey("school-access-request");
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.schoolAccessRequest.limit, RATE_LIMITS.schoolAccessRequest.windowMs))) {
    return fail("SCHOOL_ACCESS_RATE_LIMITED");
  }

  const created = await createSchoolAccessRequest(parsed.data);
  if (!created.ok) return fail(created.code);

  const headerList = await headers();
  const origin = originFromHeaders(headerList);
  const trace = await userAgentAndIp();
  await writeAuditLog({
    actorKind: "SYSTEM",
    action: "SCHOOL_ACCESS_SUBMIT",
    entityType: "SchoolRegistrationRequest",
    entityId: created.request.id,
    metadata: { editionId: parsed.data.editionId },
    ...trace,
  });
  await notifyStaffOfSchoolAccessRequest({
    requestId: created.request.id,
    schoolName: parsed.data.schoolName,
    city: parsed.data.city,
    origin,
  });
  redirect("/richiedi-accesso/inviata");
}

export async function approveSchoolAccessAction(_prev: ActionFailure | undefined, formData: FormData) {
  const { session } = await requireAdminActor();
  const id = String(formData.get("id") ?? "");
  if (!id) return fail("SCHOOL_ACCESS_NOT_FOUND");

  const headerList = await headers();
  const origin = originFromHeaders(headerList);
  const result = await approveSchoolAccessRequest({
    id,
    reviewedByUserId: session.user.id,
    origin,
  });
  if (!result.ok) return fail(result.code);

  await dispatchOutboundEmail({
    idempotencyKey: `school-access:${result.request.id}:approved`,
    purpose: "SCHOOL_ACCESS_APPROVED",
    templateKey: "SCHOOL_ACCESS_APPROVED",
    to: result.request.email,
    userId: result.request.userId,
    recipientKind: "USER",
    variables: {
      nome: result.request.firstName,
      firstName: result.request.firstName,
      schoolName: result.request.schoolName,
      activateUrl: result.activateUrl,
      scadenza: formatExpiry(result.expiresAt),
    },
    sourceEntityType: "SchoolRegistrationRequest",
    sourceEntityId: result.request.id,
    actorUserId: session.user.id,
  });
  const trace = await userAgentAndIp();
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "SCHOOL_ACCESS_APPROVE",
    entityType: "SchoolRegistrationRequest",
    entityId: result.request.id,
    metadata: { schoolName: result.request.schoolName },
    ...trace,
  });
  revalidatePath("/admin/richieste");
  revalidatePath(`/admin/richieste/${id}`);
  revalidatePath("/admin/squadre");
  redirect(`/admin/richieste/${id}`);
}

export async function rejectSchoolAccessAction(_prev: ActionFailure | undefined, formData: FormData) {
  const { session } = await requireAdminActor();
  const parsed = rejectSchoolAccessSchema.safeParse({
    id: formData.get("id"),
    rejectionReason: formData.get("rejectionReason") ?? "",
  });
  if (!parsed.success) return failValidation(parsed.error.issues[0]?.message);

  const result = await rejectSchoolAccessRequest({
    id: parsed.data.id,
    reviewedByUserId: session.user.id,
    rejectionReason: parsed.data.rejectionReason,
  });
  if (!result.ok) return fail(result.code);

  await dispatchOutboundEmail({
    idempotencyKey: `school-access:${result.request.id}:rejected`,
    purpose: "SCHOOL_ACCESS_REJECTED",
    templateKey: "SCHOOL_ACCESS_REJECTED",
    to: result.request.email,
    recipientKind: "USER",
    variables: {
      nome: result.request.firstName,
      firstName: result.request.firstName,
      schoolName: result.request.schoolName,
      summary: result.request.rejectionReason ?? it.emailSchoolAccessRejectedFallback,
    },
    sourceEntityType: "SchoolRegistrationRequest",
    sourceEntityId: result.request.id,
    actorUserId: session.user.id,
  });
  const trace = await userAgentAndIp();
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "SCHOOL_ACCESS_REJECT",
    entityType: "SchoolRegistrationRequest",
    entityId: result.request.id,
    ...trace,
  });
  revalidatePath("/admin/richieste");
  revalidatePath(`/admin/richieste/${parsed.data.id}`);
  redirect(`/admin/richieste/${parsed.data.id}`);
}

export async function resendSchoolAccessActivationAction(_prev: ActionFailure | undefined, formData: FormData) {
  const { session } = await requireAdminActor();
  const id = String(formData.get("id") ?? "");
  if (!id) return fail("SCHOOL_ACCESS_NOT_FOUND");

  const rateKey = await clientKey(`school-access-resend:${session.user.id}`);
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.emailSend.limit, RATE_LIMITS.emailSend.windowMs))) {
    return fail("SCHOOL_ACCESS_RATE_LIMITED");
  }

  const headerList = await headers();
  const result = await issueActivationToken({ id, origin: originFromHeaders(headerList) });
  if (!result.ok) return fail(result.code);

  await dispatchOutboundEmail({
    idempotencyKey: `school-access:${result.request.id}:resend:${result.expiresAt.getTime()}`,
    purpose: "SCHOOL_ACCESS_APPROVED",
    templateKey: "SCHOOL_ACCESS_APPROVED",
    to: result.request.email,
    recipientKind: "USER",
    variables: {
      nome: result.request.firstName,
      firstName: result.request.firstName,
      schoolName: result.request.schoolName,
      activateUrl: result.activateUrl,
      scadenza: formatExpiry(result.expiresAt),
    },
    sourceEntityType: "SchoolRegistrationRequest",
    sourceEntityId: result.request.id,
    actorUserId: session.user.id,
  });
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "SCHOOL_ACCESS_RESEND",
    entityType: "SchoolRegistrationRequest",
    entityId: result.request.id,
  });
  revalidatePath(`/admin/richieste/${id}`);
  return {};
}

export async function activateSchoolAccessAction(_prev: ActionFailure | undefined, formData: FormData) {
  const parsed = activateSchoolAccessSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return failValidation(parsed.error.issues[0]?.message);
  if (!isWellFormedInviteToken(parsed.data.token)) return fail("SCHOOL_ACCESS_TOKEN_INVALID");

  const rateKey = await clientKey("school-access-activate");
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.schoolAccessActivate.limit, RATE_LIMITS.schoolAccessActivate.windowMs))) {
    return fail("SCHOOL_ACCESS_RATE_LIMITED");
  }

  const found = await findSchoolAccessByActivationToken(parsed.data.token);
  const inspection = inspectSchoolAccessActivation(found);
  if (inspection !== "ok") return fail(activationErrorCode(inspection));

  const result = await activateSchoolAccessAccount(parsed.data);
  if (!result.ok) return fail(activationErrorCode(result.outcome));

  await writeAuditLog({
    actorUserId: result.userId,
    action: "SCHOOL_ACCESS_ACTIVATE",
    entityType: "SchoolRegistrationRequest",
    entityId: found?.id ?? result.userId,
  });
  await deliverEmailVerification({ userId: result.userId, email: result.email });
  redirect(`/accedi?next=${encodeURIComponent(emailVerificationPath("/area"))}`);
}
