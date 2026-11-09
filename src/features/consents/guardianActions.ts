"use server";

import {
  loadGuardianLink,
  markGuardianLinkOpened,
  submitGuardianAuthorization,
  submitGuardianRevocation,
} from "@/features/consents/data/guardianAuth";
import { enrollmentBoxCodes, publicationBoxCodes, revokeBoxCodes } from "@/features/consents/domain/guardianAuth";
import { isConsentBoxCode, submittedBoxesFrom } from "@/features/consents/domain/boxes";
import { isPartnerBoxVisible } from "@/features/consents/data/partners";
import { privacySlugsFor, MEDIA_RELEASE_SLUG } from "@/features/consents/domain/pack";
import { fail, failValidation, type ActionFailure } from "@/shared/errors";
import { it } from "@/shared/i18n/it";
import { viewWriteDenial } from "@/shared/lib/readOnlyGuard";
import { RATE_LIMITS, clientKey, consumeRateLimit, userAgentAndIp } from "@/shared/lib/request-guard";

export async function openGuardianLinkAction(token: string, purpose: "AUTHORIZE" | "PUBLICATION" | "REVOKE") {
  if (await viewWriteDenial()) return;
  const found = await loadGuardianLink(token, purpose);
  if (!found || found.stale || !found.authorization) return;
  const trace = await userAgentAndIp();
  await markGuardianLinkOpened(found.id, found.authorization.id, trace.ipAddress, trace.userAgent);
}

export async function submitGuardianAuthorizationAction(
  _prev: ActionFailure | undefined,
  formData: FormData,
): Promise<ActionFailure | { done: true; refused: boolean }> {
  const denied = await viewWriteDenial();
  if (denied) return denied;
  const token = String(formData.get("token") ?? "");
  const purposeRaw = String(formData.get("purpose") ?? "AUTHORIZE");
  const purpose = purposeRaw === "PUBLICATION" ? "PUBLICATION" : "AUTHORIZE";
  const rateKey = await clientKey(`guardian-link:${token.slice(0, 12)}`);
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.consentWrite.limit, RATE_LIMITS.consentWrite.windowMs))) {
    return fail("CONSENT_RATE_LIMITED");
  }
  const partnersPublished = await isPartnerBoxVisible();
  const codes = purpose === "PUBLICATION" ? publicationBoxCodes(partnersPublished) : enrollmentBoxCodes(partnersPublished);
  const boxes = submittedBoxesFrom(formData, codes);
  const refuse = formData.get("refuse") === "on";
  const refuseConfirm = formData.get("refuseConfirm") === "on";
  const g3Raw = String(formData.get("g3") ?? "");
  const g3 = g3Raw === "OTHER_PARENT" || g3Raw === "SOLE" ? g3Raw : null;
  const slugs = purpose === "PUBLICATION" ? [MEDIA_RELEASE_SLUG] : [...privacySlugsFor(true), MEDIA_RELEASE_SLUG];
  const versionIds: Record<string, string> = {};
  for (const slug of slugs) {
    const versionId = String(formData.get(`version:${slug}`) ?? "");
    if (versionId) versionIds[slug] = versionId;
  }
  const trace = await userAgentAndIp();
  const result = await submitGuardianAuthorization({
    token,
    purpose,
    refuse,
    refuseConfirm,
    g3,
    boxes,
    versionIds,
    ...trace,
  });
  if (!result.ok) {
    if (result.reason === "used") return fail("CONSENT_TOKEN_USED");
    if (result.reason === "required") return fail("CONSENT_BOX_REQUIRED");
    if (result.reason === "stale") return fail("CONSENT_VERSION_STALE");
    if (result.reason === "confirm") return failValidation(it.guardianLinkRefuseConfirmTitle);
    return fail("CONSENT_TOKEN_INVALID");
  }
  return { done: true, refused: result.refused };
}

export async function submitGuardianRevocationAction(
  _prev: ActionFailure | undefined,
  formData: FormData,
): Promise<ActionFailure | { done: true }> {
  const denied = await viewWriteDenial();
  if (denied) return denied;
  const token = String(formData.get("token") ?? "");
  const rateKey = await clientKey(`guardian-revoke:${token.slice(0, 12)}`);
  if (!(await consumeRateLimit(rateKey, RATE_LIMITS.consentWrite.limit, RATE_LIMITS.consentWrite.windowMs))) {
    return fail("CONSENT_RATE_LIMITED");
  }
  const partnersPublished = await isPartnerBoxVisible();
  const codes = revokeBoxCodes(partnersPublished).filter((code) => {
    if (!isConsentBoxCode(code)) return false;
    return formData.get(`box:${code}`) === "on";
  });
  const trace = await userAgentAndIp();
  const result = await submitGuardianRevocation({ token, codes, ...trace });
  if (!result.ok) {
    if (result.reason === "used") return fail("CONSENT_TOKEN_USED");
    if (result.reason === "required") return fail("CONSENT_BOX_REQUIRED");
    return fail("CONSENT_TOKEN_INVALID");
  }
  return { done: true };
}
