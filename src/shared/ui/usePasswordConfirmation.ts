"use client";

import { useId, useState, type FormEvent } from "react";
import { it } from "@/shared/i18n/it";

const MIN_LENGTH = 8;

type Issue = "tooShort" | "mismatch" | null;

type Options = {
  passwordName?: string;
  confirmName?: string;
};

function read(form: HTMLFormElement, passwordName: string, confirmName: string) {
  const data = new FormData(form);
  return {
    password: String(data.get(passwordName) ?? ""),
    confirm: String(data.get(confirmName) ?? ""),
  };
}

function issueFor(password: string, confirm: string, requireConfirm: boolean): Issue {
  if (password.length < MIN_LENGTH) return "tooShort";
  if (requireConfirm && password !== confirm) return "mismatch";
  return null;
}

export function usePasswordConfirmation(options: Options = {}) {
  const passwordName = options.passwordName ?? "password";
  const confirmName = options.confirmName ?? "confirmPassword";
  const passwordErrorId = useId();
  const confirmErrorId = useId();
  const [issue, setIssue] = useState<Issue>(null);
  const [confirmFilled, setConfirmFilled] = useState(false);

  function check(form: HTMLFormElement, requireConfirm: boolean) {
    if (!form.elements.namedItem(passwordName)) return null;
    const { password, confirm } = read(form, passwordName, confirmName);
    return issueFor(password, confirm, requireConfirm);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const next = check(event.currentTarget, true);
    if (!next) {
      setIssue(null);
      return;
    }
    event.preventDefault();
    setIssue(next);
    const name = next === "mismatch" ? confirmName : passwordName;
    const field = event.currentTarget.elements.namedItem(name);
    if (field instanceof HTMLElement) field.focus();
  }

  function onChange(event: FormEvent<HTMLFormElement>) {
    const { password, confirm } = read(event.currentTarget, passwordName, confirmName);
    setConfirmFilled(confirm.length > 0);
    if (issue === "tooShort") {
      if (password.length < MIN_LENGTH) {
        setIssue("tooShort");
        return;
      }
      setIssue(confirm.length > 0 && password !== confirm ? "mismatch" : null);
      return;
    }
    if (confirm.length > 0) {
      setIssue(password !== confirm ? "mismatch" : password.length < MIN_LENGTH ? "tooShort" : null);
      return;
    }
    if (issue === "mismatch") setIssue(null);
  }

  const confirmOk = confirmFilled && issue === null;

  return {
    issue,
    onSubmit,
    onChange,
    passwordInvalid: issue === "tooShort",
    confirmInvalid: issue === "mismatch",
    passwordErrorId: issue === "tooShort" ? passwordErrorId : undefined,
    confirmErrorId: issue === "mismatch" ? confirmErrorId : undefined,
    passwordMessage: issue === "tooShort" ? it.passwordTooShort : null,
    confirmMessage: issue === "mismatch" ? it.passwordMismatch : null,
    confirmOk,
    matchMessage: it.passwordMatch,
    confirmStatusId: issue === "mismatch" || confirmOk ? confirmErrorId : undefined,
  };
}

export type PasswordConfirmation = ReturnType<typeof usePasswordConfirmation>;
