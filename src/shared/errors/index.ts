export { ERROR_CODES, isErrorCode, type ErrorCode } from "./codes";
export {
  ERROR_CATALOG,
  ERROR_CODE_LIST,
  codesInCategory,
  getErrorDefinition,
  type ErrorCategory,
  type ErrorDefinition,
  type ErrorSeverity,
  type RecoveryAction,
} from "./catalog";
export {
  fail,
  failValidation,
  recoveryHint,
  retryHint,
  userMessage,
  errorI18nKey,
  type ActionFailure,
  type ActionState,
} from "./result";
