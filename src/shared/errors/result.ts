import { it } from "@/shared/i18n/it";
import { ERROR_CATALOG, type RecoveryAction } from "./catalog";
import { type ErrorCode } from "./codes";

export type ActionState<T extends object = object> = {
  error?: string;
  code?: ErrorCode;
  retrySafe?: boolean;
} & T;

export type ActionFailure = ActionState;

const I18N_PREFIX = "error" as const;

export function errorI18nKey(code: ErrorCode): `error${ErrorCode}` {
  return `${I18N_PREFIX}${code}`;
}

export function userMessage(code: ErrorCode): string {
  const key = errorI18nKey(code);
  const value = it[key as keyof typeof it];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Manca la chiave i18n ${key}`);
  }
  return value;
}

export function fail(code: ErrorCode, detail?: string): ActionFailure {
  return {
    error: detail ?? userMessage(code),
    code,
    retrySafe: ERROR_CATALOG[code].retrySafe,
  };
}

export function failValidation(issue?: string): ActionFailure {
  return fail("VALIDATION_INVALID_INPUT", issue ?? userMessage("VALIDATION_INVALID_INPUT"));
}

export function recoveryHint(action: RecoveryAction): string | null {
  switch (action) {
    case "retry":
      return it.errorHintRetry;
    case "login":
      return it.errorHintLogin;
    case "logout_retry_invite":
      return it.errorHintLogoutRetryInvite;
    case "contact_org":
      return it.errorHintContactOrg;
    case "correct_input":
      return it.errorHintCorrectInput;
    case "use_original_account":
      return it.errorHintUseOriginalAccount;
    case "withdraw_registration":
      return it.errorHintWithdrawRegistration;
    case "request_new_invite":
      return it.errorHintRequestNewInvite;
    case "wait":
      return it.errorHintWait;
    case "none":
      return null;
  }
}

export function retryHint(retrySafe: boolean): string {
  return retrySafe ? it.errorHintRetrySafe : it.errorHintRetryUnsafe;
}
