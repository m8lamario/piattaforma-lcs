"use client";

import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { savePersonalDataAction } from "@/features/players/actions";
import { formatDateOnly } from "@/features/players/domain/dates";
import { personalDataSchema } from "@/features/players/schemas/personal";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

type Values = {
  firstName: string;
  lastName: string;
  birthDate: string;
  fiscalCode: string;
  phone: string;
  intent: "continue" | "exit";
};

type Props = {
  email: string;
  defaults: {
    firstName: string;
    lastName: string;
    birthDate: Date | null;
    fiscalCode: string | null;
    phone: string | null;
  };
};

export function PersonalDataForm({ email, defaults }: Props) {
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

  function submit(intent: "continue" | "exit") {
    void form.handleSubmit((values) => {
      const data = new FormData();
      data.set("firstName", values.firstName);
      data.set("lastName", values.lastName);
      data.set("birthDate", values.birthDate);
      data.set("fiscalCode", values.fiscalCode);
      data.set("phone", values.phone);
      data.set("intent", intent);
      action(data);
    })();
  }

  const clientError = Object.values(form.formState.errors).find((error) => error?.message)?.message;

  return (
    <form className={fields.form} noValidate aria-busy={pending} onSubmit={(event) => event.preventDefault()}>
      {clientError || state?.error ? (
        <p className={fields.summary} role="alert">
          {state?.error ?? clientError ?? it.formErrorSummary}
        </p>
      ) : null}

      <fieldset className={fields.group}>
        <legend className={fields.legend}>{it.fieldGroupIdentity}</legend>
        <div className={fields.pair}>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="firstName">
              {it.firstName}
            </label>
            <input id="firstName" className={fields.input} autoComplete="given-name" aria-invalid={Boolean(form.formState.errors.firstName)} {...form.register("firstName")} />
          </div>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="lastName">
              {it.lastName}
            </label>
            <input id="lastName" className={fields.input} autoComplete="family-name" aria-invalid={Boolean(form.formState.errors.lastName)} {...form.register("lastName")} />
          </div>
        </div>
        <div className={fields.pair}>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="birthDate">
              {it.birthDate}
            </label>
            <input id="birthDate" className={fields.input} type="date" aria-invalid={Boolean(form.formState.errors.birthDate)} {...form.register("birthDate")} />
          </div>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="fiscalCode">
              {it.fiscalCode}
            </label>
            <input
              id="fiscalCode"
              className={fields.input}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={Boolean(form.formState.errors.fiscalCode)}
              {...form.register("fiscalCode")}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className={fields.group}>
        <legend className={fields.legend}>{it.fieldGroupContact}</legend>
        <p className={fields.readonly}>
          {it.emailReadOnly}: <strong>{email}</strong>
        </p>
        <div className={fields.field}>
          <label className={fields.label} htmlFor="phone">
            {it.phone}
          </label>
          <input id="phone" className={fields.input} type="tel" autoComplete="tel" aria-invalid={Boolean(form.formState.errors.phone)} {...form.register("phone")} />
        </div>
      </fieldset>

      <div className={`${fields.actions} ${fields.sticky}`}>
        <Button type="button" disabled={pending} aria-busy={pending} onClick={() => submit("continue")}>
          {pending ? it.saving : it.saveContinue}
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={() => submit("exit")}>
          {it.saveExit}
        </Button>
      </div>
    </form>
  );
}
