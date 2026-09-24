"use client";

import { startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { saveGuardianAction } from "@/features/players/actions";
import { GUARDIAN_RELATIONSHIPS, type GuardianRelationship } from "@/features/players/domain/personal";
import { guardianSchema } from "@/features/players/schemas/guardian";
import { Button } from "@/shared/ui/Button";
import { ActionError } from "@/shared/ui/ActionError";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

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
      startTransition(() => {
        action(data);
      });
    })();
  }

  const clientError = Object.values(form.formState.errors).find((error) => error?.message)?.message;

  return (
    <form className={fields.form} noValidate aria-busy={pending} onSubmit={(event) => event.preventDefault()}>
      {clientError || state?.error ? <ActionError error={state?.error ?? clientError} code={state?.code} /> : null}

      <fieldset className={fields.group}>
        <legend className={fields.legend}>{it.fieldGroupGuardianPerson}</legend>
        <div className={fields.pair}>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="guardian-first">
              {it.firstName}
            </label>
            <input
              id="guardian-first"
              className={fields.input}
              autoComplete="given-name"
              aria-invalid={Boolean(form.formState.errors.firstName)}
              {...form.register("firstName")}
            />
          </div>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="guardian-last">
              {it.lastName}
            </label>
            <input
              id="guardian-last"
              className={fields.input}
              autoComplete="family-name"
              aria-invalid={Boolean(form.formState.errors.lastName)}
              {...form.register("lastName")}
            />
          </div>
        </div>
        <div className={fields.field}>
          <label className={fields.label} htmlFor="relationship">
            {it.relationship}
          </label>
          <select id="relationship" className={fields.select} aria-invalid={Boolean(form.formState.errors.relationship)} {...form.register("relationship")}>
            {GUARDIAN_RELATIONSHIPS.map((value) => (
              <option key={value} value={value}>
                {RELATION_LABEL[value]}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      <fieldset className={fields.group}>
        <legend className={fields.legend}>{it.fieldGroupGuardianContact}</legend>
        <div className={fields.pair}>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="guardian-email">
              {it.email}
            </label>
            <input
              id="guardian-email"
              className={fields.input}
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(form.formState.errors.email)}
              {...form.register("email")}
            />
          </div>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="guardian-phone">
              {it.phone}
            </label>
            <input
              id="guardian-phone"
              className={fields.input}
              type="tel"
              autoComplete="tel"
              aria-invalid={Boolean(form.formState.errors.phone)}
              {...form.register("phone")}
            />
          </div>
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
