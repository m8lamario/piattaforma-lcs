import { it } from "@/shared/i18n/it";
import { FieldStatus } from "./FieldStatus";
import type { PasswordConfirmation } from "./usePasswordConfirmation";
import fields from "./form.module.css";

type Props = {
  passwords: PasswordConfirmation;
  passwordId: string;
  confirmId: string;
  hintId: string;
  passwordName?: string;
  confirmName?: string;
  passwordLabel?: string;
};

export function PasswordFields({
  passwords,
  passwordId,
  confirmId,
  hintId,
  passwordName = "password",
  confirmName = "confirmPassword",
  passwordLabel = it.password,
}: Props) {
  const pairClass = [
    fields.secretPair,
    passwords.passwordInvalid || passwords.confirmInvalid ? fields.secretPairDanger : "",
    passwords.confirmOk ? fields.secretPairOk : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={pairClass}>
      <div className={fields.field}>
        <label className={fields.label} htmlFor={passwordId}>
          {passwordLabel}
        </label>
        <input
          id={passwordId}
          name={passwordName}
          className={`${fields.input} ${passwords.confirmOk ? fields.inputOk : ""}`}
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          aria-invalid={passwords.passwordInvalid}
          aria-describedby={[hintId, passwords.passwordErrorId].filter(Boolean).join(" ")}
        />
        <p id={hintId} className={fields.help}>
          {it.passwordHint}
        </p>
        {passwords.passwordMessage ? (
          <FieldStatus id={passwords.passwordErrorId} tone="danger">
            {passwords.passwordMessage}
          </FieldStatus>
        ) : null}
      </div>
      <div className={fields.field}>
        <label className={fields.label} htmlFor={confirmId}>
          {it.confirmPassword}
        </label>
        <input
          id={confirmId}
          name={confirmName}
          className={`${fields.input} ${passwords.confirmOk ? fields.inputOk : ""}`}
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          aria-invalid={passwords.confirmInvalid}
          aria-describedby={passwords.confirmStatusId}
        />
        {passwords.confirmMessage ? (
          <FieldStatus id={passwords.confirmStatusId} tone="danger">
            {passwords.confirmMessage}
          </FieldStatus>
        ) : null}
        {passwords.confirmOk ? (
          <FieldStatus id={passwords.confirmStatusId} tone="ok">
            {passwords.matchMessage}
          </FieldStatus>
        ) : null}
      </div>
    </div>
  );
}
