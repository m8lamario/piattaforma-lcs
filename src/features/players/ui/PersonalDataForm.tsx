"use client";

import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { savePersonalDataAction } from "@/features/players/actions";
import { formatDateOnly } from "@/features/players/domain/dates";
import { personalDataSchema } from "@/features/players/schemas/personal";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import styles from "@/features/registrations/ui/WizardForm.module.css";

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
    <form className={styles.form} noValidate onSubmit={(event) => event.preventDefault()}>
      {clientError || state?.error ? (
        <p className={styles.summary} role="alert">
          {state?.error ?? clientError ?? it.formErrorSummary}
        </p>
      ) : null}

      <label className={styles.label} htmlFor="firstName">
        {it.firstName}
      </label>
      <input id="firstName" className={styles.input} autoComplete="given-name" {...form.register("firstName")} />

      <label className={styles.label} htmlFor="lastName">
        {it.lastName}
      </label>
      <input id="lastName" className={styles.input} autoComplete="family-name" {...form.register("lastName")} />

      <label className={styles.label} htmlFor="birthDate">
        {it.birthDate}
      </label>
      <input id="birthDate" className={styles.input} type="date" {...form.register("birthDate")} />

      <label className={styles.label} htmlFor="fiscalCode">
        {it.fiscalCode}
      </label>
      <input
        id="fiscalCode"
        className={styles.input}
        autoComplete="off"
        spellCheck={false}
        {...form.register("fiscalCode")}
      />

      <p className={styles.readonly}>
        {it.emailReadOnly}: <strong>{email}</strong>
      </p>

      <label className={styles.label} htmlFor="phone">
        {it.phone}
      </label>
      <input id="phone" className={styles.input} type="tel" autoComplete="tel" {...form.register("phone")} />

      <div className={styles.actions}>
        <Button type="button" disabled={pending} onClick={() => submit("continue")}>
          {pending ? "Salvataggio…" : it.saveContinue}
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={() => submit("exit")}>
          {it.saveExit}
        </Button>
      </div>
    </form>
  );
}
