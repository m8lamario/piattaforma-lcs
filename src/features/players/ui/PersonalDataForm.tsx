"use client";

import { startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { savePersonalDataAction } from "@/features/players/actions";
import { formatDateOnly } from "@/features/players/domain/dates";
import { personalDataSchema } from "@/features/players/schemas/personal";
import { Button } from "@/shared/ui/Button";
import { WizardLaterButton } from "@/features/registrations/ui/WizardShell";
import { ActionError } from "@/shared/ui/ActionError";
import { FieldStatus } from "@/shared/ui/FieldStatus";
import { FormErrorSummary, fieldMessages } from "@/shared/ui/FormErrorSummary";
import { IdentityConflictPanel } from "@/features/players/ui/IdentityConflictPanel";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
import type { ErrorCode } from "@/shared/errors";

type Values = {
  firstName: string;
  lastName: string;
  birthDate: string;
  fiscalCode: string;
  phone: string;
  intent: "continue" | "exit";
};

const FIELD_ORDER = ["firstName", "lastName", "birthDate", "fiscalCode", "phone"] as const;

type Props = {
  email: string;
  registrationId: string;
  identityConflict?: { code: ErrorCode } | null;
  defaults: {
    firstName: string;
    lastName: string;
    birthDate: Date | null;
    fiscalCode: string | null;
    phone: string | null;
  };
};

export function PersonalDataForm({ email, defaults, registrationId, identityConflict }: Props) {
  const [state, action, pending] = useActionState(savePersonalDataAction, undefined);
  const form = useForm<Values>({
    resolver: zodResolver(personalDataSchema),
    mode: "onBlur",
    defaultValues: {
      firstName: defaults.firstName,
      lastName: defaults.lastName,
      birthDate: defaults.birthDate ? formatDateOnly(defaults.birthDate) : "",
      fiscalCode: defaults.fiscalCode ?? "",
      phone: defaults.phone ?? "",
      intent: "continue",
    },
  });

  function focusFirstError(errors: typeof form.formState.errors) {
    const first = FIELD_ORDER.find((name) => errors[name]);
    if (first) document.getElementById(first)?.focus();
  }

  function submit(intent: "continue" | "exit") {
    void form.handleSubmit(
      (values) => {
        const data = new FormData();
        data.set("firstName", values.firstName);
        data.set("lastName", values.lastName);
        data.set("birthDate", values.birthDate);
        data.set("fiscalCode", values.fiscalCode);
        data.set("phone", values.phone);
        data.set("intent", intent);
        startTransition(() => {
          action(data);
        });
      },
      (errors) => {
        focusFirstError(errors);
      },
    )();
  }

  const errors = form.formState.errors;
  const showSummary = form.formState.submitCount > 0;
  const stuckWithoutIdentity =
    Boolean(identityConflict) || state?.code === "IDENTITY_FISCAL_CODE_ASSOCIATED";
  const serverError = stuckWithoutIdentity ? undefined : state?.error;

  return (
    <form className={fields.form} noValidate aria-busy={pending} onSubmit={(event) => event.preventDefault()}>
      {stuckWithoutIdentity ? (
        <IdentityConflictPanel registrationId={registrationId} showFormHint={false} section="alert" />
      ) : null}
      {showSummary ? <FormErrorSummary messages={fieldMessages(errors)} /> : null}
      {serverError ? <ActionError error={serverError} code={state?.code} /> : null}

      <fieldset className={fields.group}>
        <legend className={fields.legend}>{it.fieldGroupIdentity}</legend>
        <div className={fields.pair}>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="firstName">
              {it.firstName}
            </label>
            <input
              id="firstName"
              className={fields.input}
              autoComplete="given-name"
              aria-invalid={Boolean(errors.firstName)}
              aria-describedby={errors.firstName ? "firstName-error" : undefined}
              {...form.register("firstName")}
            />
            {errors.firstName?.message ? (
              <FieldStatus id="firstName-error" tone="danger">
                {errors.firstName.message}
              </FieldStatus>
            ) : null}
          </div>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="lastName">
              {it.lastName}
            </label>
            <input
              id="lastName"
              className={fields.input}
              autoComplete="family-name"
              aria-invalid={Boolean(errors.lastName)}
              aria-describedby={errors.lastName ? "lastName-error" : undefined}
              {...form.register("lastName")}
            />
            {errors.lastName?.message ? (
              <FieldStatus id="lastName-error" tone="danger">
                {errors.lastName.message}
              </FieldStatus>
            ) : null}
          </div>
        </div>
        <div className={fields.field}>
          <label className={fields.label} htmlFor="birthDate">
            {it.birthDate}
          </label>
          <input
            id="birthDate"
            className={fields.input}
            type="date"
            aria-invalid={Boolean(errors.birthDate)}
            aria-describedby={errors.birthDate ? "birthDate-error" : undefined}
            {...form.register("birthDate")}
          />
          {errors.birthDate?.message ? (
            <FieldStatus id="birthDate-error" tone="danger">
              {errors.birthDate.message}
            </FieldStatus>
          ) : null}
        </div>
        <div className={fields.field}>
          <label className={fields.label} htmlFor="fiscalCode">
            {it.fiscalCode}
          </label>
          <input
            id="fiscalCode"
            className={fields.input}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-invalid={Boolean(errors.fiscalCode)}
            aria-describedby={errors.fiscalCode ? "fiscalCode-error" : undefined}
            {...form.register("fiscalCode")}
          />
          {errors.fiscalCode?.message ? (
            <FieldStatus id="fiscalCode-error" tone="danger">
              {errors.fiscalCode.message}
            </FieldStatus>
          ) : null}
        </div>
      </fieldset>

      <fieldset className={fields.group}>
        <legend className={fields.legend}>{it.fieldGroupContact}</legend>
        <div className={fields.field}>
          <label className={fields.label} htmlFor="account-email">
            {it.emailReadOnly}
          </label>
          <input id="account-email" className={fields.input} value={email} disabled readOnly />
        </div>
        <div className={fields.field}>
          <label className={fields.label} htmlFor="phone">
            {it.phone}
          </label>
          <input
            id="phone"
            className={fields.input}
            type="tel"
            autoComplete="tel"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "phone-error" : undefined}
            {...form.register("phone")}
          />
          {errors.phone?.message ? (
            <FieldStatus id="phone-error" tone="danger">
              {errors.phone.message}
            </FieldStatus>
          ) : null}
        </div>
      </fieldset>

      {stuckWithoutIdentity ? (
        <IdentityConflictPanel registrationId={registrationId} showFormHint={false} section="recovery" />
      ) : null}

      <div className={`${fields.actions} ${fields.sticky}`}>
        <Button type="button" disabled={pending} aria-busy={pending} onClick={() => submit("continue")}>
          {pending ? it.saving : it.saveContinue}
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={() => submit("exit")}>
          {it.saveExit}
        </Button>
        <WizardLaterButton />
      </div>
    </form>
  );
}
