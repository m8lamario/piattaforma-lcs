"use client";

import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { saveGuardianAction } from "@/features/players/actions";
import { GUARDIAN_RELATIONSHIPS, type GuardianRelationship } from "@/features/players/domain/personal";
import { guardianSchema } from "@/features/players/schemas/guardian";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import styles from "@/features/registrations/ui/WizardForm.module.css";

type Values = {
  firstName: string;
  lastName: string;
  relationship: GuardianRelationship;
  email: string;
  phone: string;
  intent: "continue" | "exit";
};

const RELATION_LABEL: Record<GuardianRelationship, string> = {
  GENITORE: it.relGenitore,
  TUTORE: it.relTutore,
  AFFIDATARIO: it.relAffidatario,
  ALTRO: it.relAltro,
};

type Props = {
  defaults: {
    firstName: string;
    lastName: string;
    relationship: string;
    email: string;
    phone: string;
  };
};

export function GuardianForm({ defaults }: Props) {
  const [state, action, pending] = useActionState(saveGuardianAction, undefined);
  const relationship = GUARDIAN_RELATIONSHIPS.includes(defaults.relationship as GuardianRelationship)
    ? (defaults.relationship as GuardianRelationship)
    : "GENITORE";
  const form = useForm<Values>({
    resolver: zodResolver(guardianSchema),
    mode: "onBlur",
    defaultValues: {
      firstName: defaults.firstName,
      lastName: defaults.lastName,
      relationship,
      email: defaults.email,
      phone: defaults.phone,
      intent: "continue",
    },
  });

  function submit(intent: "continue" | "exit") {
    void form.handleSubmit((values) => {
      const data = new FormData();
      data.set("firstName", values.firstName);
      data.set("lastName", values.lastName);
      data.set("relationship", values.relationship);
      data.set("email", values.email);
      data.set("phone", values.phone);
      data.set("intent", intent);
      action(data);
    })();
  }

  const clientError = Object.values(form.formState.errors).find((error) => error?.message)?.message;

  return (
    <form className={styles.form} noValidate onSubmit={(event) => event.preventDefault()}>
      <p className={styles.help}>{it.guardianHelp}</p>
      {clientError || state?.error ? (
        <p className={styles.summary} role="alert">
          {state?.error ?? clientError ?? it.formErrorSummary}
        </p>
      ) : null}

      <label className={styles.label} htmlFor="guardian-first">
        {it.firstName}
      </label>
      <input id="guardian-first" className={styles.input} autoComplete="given-name" {...form.register("firstName")} />

      <label className={styles.label} htmlFor="guardian-last">
        {it.lastName}
      </label>
      <input id="guardian-last" className={styles.input} autoComplete="family-name" {...form.register("lastName")} />

      <label className={styles.label} htmlFor="relationship">
        {it.relationship}
      </label>
      <select id="relationship" className={styles.select} {...form.register("relationship")}>
        {GUARDIAN_RELATIONSHIPS.map((value) => (
          <option key={value} value={value}>
            {RELATION_LABEL[value]}
          </option>
        ))}
      </select>

      <label className={styles.label} htmlFor="guardian-email">
        {it.email}
      </label>
      <input id="guardian-email" className={styles.input} type="email" autoComplete="email" {...form.register("email")} />

      <label className={styles.label} htmlFor="guardian-phone">
        {it.phone}
      </label>
      <input id="guardian-phone" className={styles.input} type="tel" autoComplete="tel" {...form.register("phone")} />

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
