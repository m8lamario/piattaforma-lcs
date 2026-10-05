"use client";

import { startTransition, useActionState, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { saveGuardianAction } from "@/features/players/actions";
import { GUARDIAN_RELATIONSHIPS, type GuardianRelationship } from "@/features/players/domain/personal";
import { guardianSchema } from "@/features/players/schemas/guardian";
import { Button } from "@/shared/ui/Button";
import { ActionError } from "@/shared/ui/ActionError";
import { FieldStatus } from "@/shared/ui/FieldStatus";
import { FormErrorSummary, fieldMessages } from "@/shared/ui/FormErrorSummary";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

type Values = {
  firstName: string;
  lastName: string;
  relationship: GuardianRelationship;
  email: string;
  phone: string;
  g3?: "OTHER_PARENT" | "SOLE";
  secondFirstName?: string;
  secondLastName?: string;
  secondEmail?: string;
  g1: boolean;
  intent: "continue" | "exit";
};

const RELATION_LABEL: Record<GuardianRelationship, string> = {
  GENITORE: it.relGenitore,
  TUTORE: it.relTutore,
  AFFIDATARIO: it.relAffidatario,
  ALTRO: it.relAltro,
};

const FIELD_ORDER = [
  "firstName",
  "lastName",
  "relationship",
  "email",
  "phone",
  "g3",
  "secondFirstName",
  "secondLastName",
  "secondEmail",
  "g1",
] as const;

type Props = {
  defaults: {
    firstName: string;
    lastName: string;
    relationship: string;
    email: string;
    phone: string;
    g3: "OTHER_PARENT" | "SOLE" | null;
    secondFirstName: string;
    secondLastName: string;
    secondEmail: string;
  };
};

export function GuardianForm({ defaults }: Props) {
  const [state, action, pending] = useActionState(saveGuardianAction, undefined);
  const relationship = GUARDIAN_RELATIONSHIPS.includes(defaults.relationship as GuardianRelationship)
    ? (defaults.relationship as GuardianRelationship)
    : "GENITORE";
  const form = useForm<Values>({
    resolver: zodResolver(guardianSchema) as Resolver<Values>,
    mode: "onBlur",
    defaultValues: {
      firstName: defaults.firstName,
      lastName: defaults.lastName,
      relationship,
      email: defaults.email,
      phone: defaults.phone,
      g3: defaults.g3 ?? undefined,
      secondFirstName: defaults.secondFirstName,
      secondLastName: defaults.secondLastName,
      secondEmail: defaults.secondEmail,
      g1: false,
      intent: "continue",
    },
  });
  const g3Register = form.register("g3");
  const [g3Choice, setG3Choice] = useState<"OTHER_PARENT" | "SOLE" | undefined>(defaults.g3 ?? undefined);
  const errors = form.formState.errors;
  const showSummary = form.formState.submitCount > 0;

  function focusFirstError(formErrors: typeof errors) {
    const ids: Record<(typeof FIELD_ORDER)[number], string> = {
      firstName: "guardian-first",
      lastName: "guardian-last",
      relationship: "relationship",
      email: "guardian-email",
      phone: "guardian-phone",
      g3: "g3-other",
      secondFirstName: "second-first",
      secondLastName: "second-last",
      secondEmail: "second-email",
      g1: "g1",
    };
    const first = FIELD_ORDER.find((name) => formErrors[name]);
    if (first) document.getElementById(ids[first])?.focus();
  }

  function submit(intent: "continue" | "exit") {
    void form.handleSubmit(
      (values) => {
        const data = new FormData();
        data.set("firstName", values.firstName);
        data.set("lastName", values.lastName);
        data.set("relationship", values.relationship);
        data.set("email", values.email);
        data.set("phone", values.phone);
        data.set("g3", values.g3 ?? "");
        data.set("secondFirstName", values.secondFirstName ?? "");
        data.set("secondLastName", values.secondLastName ?? "");
        data.set("secondEmail", values.secondEmail ?? "");
        if (values.g1) data.set("g1", "on");
        data.set("intent", intent);
        startTransition(() => {
          action(data);
        });
      },
      (formErrors) => {
        focusFirstError(formErrors);
      },
    )();
  }

  return (
    <form className={fields.form} noValidate aria-busy={pending} onSubmit={(event) => event.preventDefault()}>
      {showSummary ? <FormErrorSummary messages={fieldMessages(errors)} /> : null}
      {state?.error ? <ActionError error={state.error} code={state.code} /> : null}

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
              aria-invalid={Boolean(errors.firstName)}
              aria-describedby={errors.firstName ? "guardian-first-error" : undefined}
              {...form.register("firstName")}
            />
            {errors.firstName?.message ? (
              <FieldStatus id="guardian-first-error" tone="danger">
                {errors.firstName.message}
              </FieldStatus>
            ) : null}
          </div>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="guardian-last">
              {it.lastName}
            </label>
            <input
              id="guardian-last"
              className={fields.input}
              autoComplete="family-name"
              aria-invalid={Boolean(errors.lastName)}
              aria-describedby={errors.lastName ? "guardian-last-error" : undefined}
              {...form.register("lastName")}
            />
            {errors.lastName?.message ? (
              <FieldStatus id="guardian-last-error" tone="danger">
                {errors.lastName.message}
              </FieldStatus>
            ) : null}
          </div>
        </div>
        <div className={fields.field}>
          <label className={fields.label} htmlFor="relationship">
            {it.relationship}
          </label>
          <select
            id="relationship"
            className={fields.select}
            aria-invalid={Boolean(errors.relationship)}
            aria-describedby={errors.relationship ? "relationship-error" : undefined}
            {...form.register("relationship")}
          >
            {GUARDIAN_RELATIONSHIPS.map((value) => (
              <option key={value} value={value}>
                {RELATION_LABEL[value]}
              </option>
            ))}
          </select>
          {errors.relationship?.message ? (
            <FieldStatus id="relationship-error" tone="danger">
              {errors.relationship.message}
            </FieldStatus>
          ) : null}
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
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "guardian-email-error" : undefined}
              {...form.register("email")}
            />
            {errors.email?.message ? (
              <FieldStatus id="guardian-email-error" tone="danger">
                {errors.email.message}
              </FieldStatus>
            ) : null}
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
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? "guardian-phone-error" : undefined}
              {...form.register("phone")}
            />
            {errors.phone?.message ? (
              <FieldStatus id="guardian-phone-error" tone="danger">
                {errors.phone.message}
              </FieldStatus>
            ) : null}
          </div>
        </div>
      </fieldset>

      <fieldset className={fields.group}>
        <legend className={fields.legend}>{it.g3Legend}</legend>
        <label className={fields.radio} htmlFor="g3-other">
          <input
            id="g3-other"
            type="radio"
            value="OTHER_PARENT"
            aria-describedby={errors.g3 ? "g3-error" : undefined}
            {...g3Register}
            onChange={(event) => {
              void g3Register.onChange(event);
              setG3Choice("OTHER_PARENT");
            }}
          />
          {it.g3Other}
        </label>
        <label className={fields.radio} htmlFor="g3-sole">
          <input
            id="g3-sole"
            type="radio"
            value="SOLE"
            aria-describedby={errors.g3 ? "g3-error" : undefined}
            {...g3Register}
            onChange={(event) => {
              void g3Register.onChange(event);
              setG3Choice("SOLE");
            }}
          />
          {it.g3Sole}
        </label>
        {errors.g3?.message ? (
          <FieldStatus id="g3-error" tone="danger">
            {errors.g3.message}
          </FieldStatus>
        ) : null}
        {g3Choice === "OTHER_PARENT" ? (
          <>
            <div className={fields.pair}>
              <div className={fields.field}>
                <label className={fields.label} htmlFor="second-first">
                  {it.g3SecondName}
                </label>
                <input
                  id="second-first"
                  className={fields.input}
                  aria-invalid={Boolean(errors.secondFirstName)}
                  aria-describedby={errors.secondFirstName ? "second-first-error" : undefined}
                  {...form.register("secondFirstName")}
                />
                {errors.secondFirstName?.message ? (
                  <FieldStatus id="second-first-error" tone="danger">
                    {errors.secondFirstName.message}
                  </FieldStatus>
                ) : null}
              </div>
              <div className={fields.field}>
                <label className={fields.label} htmlFor="second-last">
                  {it.g3SecondLastName}
                </label>
                <input
                  id="second-last"
                  className={fields.input}
                  aria-invalid={Boolean(errors.secondLastName)}
                  aria-describedby={errors.secondLastName ? "second-last-error" : undefined}
                  {...form.register("secondLastName")}
                />
                {errors.secondLastName?.message ? (
                  <FieldStatus id="second-last-error" tone="danger">
                    {errors.secondLastName.message}
                  </FieldStatus>
                ) : null}
              </div>
            </div>
            <div className={fields.field}>
              <label className={fields.label} htmlFor="second-email">
                {it.g3SecondEmail}
              </label>
              <input
                id="second-email"
                className={fields.input}
                type="email"
                aria-invalid={Boolean(errors.secondEmail)}
                aria-describedby={errors.secondEmail ? "second-email-error" : undefined}
                {...form.register("secondEmail")}
              />
              {errors.secondEmail?.message ? (
                <FieldStatus id="second-email-error" tone="danger">
                  {errors.secondEmail.message}
                </FieldStatus>
              ) : null}
            </div>
          </>
        ) : null}
      </fieldset>

      <label className={fields.radio} htmlFor="g1">
        <input id="g1" type="checkbox" aria-invalid={Boolean(errors.g1)} aria-describedby={errors.g1 ? "g1-error" : undefined} {...form.register("g1")} />
        {it.boxG1}
      </label>
      {errors.g1?.message ? (
        <FieldStatus id="g1-error" tone="danger">
          {errors.g1.message}
        </FieldStatus>
      ) : null}

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
