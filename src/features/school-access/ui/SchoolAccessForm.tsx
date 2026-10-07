"use client";

import { startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { submitSchoolAccessAction } from "@/features/school-access/actions";
import {
  schoolAccessRequestSchema,
  type SchoolAccessRequestValues,
} from "@/features/school-access/schemas/request";
import { ActionError } from "@/shared/ui/ActionError";
import { Button } from "@/shared/ui/Button";
import { FieldStatus } from "@/shared/ui/FieldStatus";
import { FormErrorSummary, fieldMessages } from "@/shared/ui/FormErrorSummary";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

type EditionOption = { id: string; label: string };

const FIELD_ORDER = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "schoolName",
  "city",
  "requesterRole",
  "institutionalEmail",
  "editionId",
] as const;

type Props = {
  editions: EditionOption[];
};

export function SchoolAccessForm({ editions }: Props) {
  const [state, action, pending] = useActionState(submitSchoolAccessAction, undefined);
  const form = useForm<SchoolAccessRequestValues>({
    resolver: zodResolver(schoolAccessRequestSchema),
    mode: "onBlur",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      schoolName: "",
      city: "",
      institutionalEmail: "",
      editionId: "",
    },
  });

  function focusFirstError(errors: typeof form.formState.errors) {
    const first = FIELD_ORDER.find((name) => errors[name]);
    if (first) document.getElementById(first)?.focus();
  }

  const errors = form.formState.errors;
  const showSummary = form.formState.submitCount > 0;

  return (
    <form
      className={fields.form}
      noValidate
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit(
          (values) => {
            const data = new FormData();
            data.set("firstName", values.firstName);
            data.set("lastName", values.lastName);
            data.set("email", values.email);
            data.set("phone", values.phone);
            data.set("schoolName", values.schoolName);
            data.set("city", values.city);
            data.set("requesterRole", values.requesterRole);
            data.set("institutionalEmail", values.institutionalEmail);
            data.set("editionId", values.editionId);
            startTransition(() => {
              action(data);
            });
          },
          (formErrors) => {
            focusFirstError(formErrors);
          },
        )();
      }}
    >
      {showSummary ? <FormErrorSummary messages={fieldMessages(errors)} /> : null}
      {state?.error ? <ActionError error={state.error} code={state.code} /> : null}

      <fieldset className={fields.group}>
        <legend className={fields.legend}>{it.schoolAccessRequester}</legend>
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
          <label className={fields.label} htmlFor="email">
            {it.email}
          </label>
          <input
            id="email"
            className={fields.input}
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...form.register("email")}
          />
          {errors.email?.message ? (
            <FieldStatus id="email-error" tone="danger">
              {errors.email.message}
            </FieldStatus>
          ) : null}
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

      <fieldset className={fields.group}>
        <legend className={fields.legend}>{it.adminSchool}</legend>
        <div className={fields.field}>
          <label className={fields.label} htmlFor="schoolName">
            {it.schoolAccessSchoolName}
          </label>
          <input
            id="schoolName"
            className={fields.input}
            aria-invalid={Boolean(errors.schoolName)}
            aria-describedby={errors.schoolName ? "schoolName-error" : undefined}
            {...form.register("schoolName")}
          />
          {errors.schoolName?.message ? (
            <FieldStatus id="schoolName-error" tone="danger">
              {errors.schoolName.message}
            </FieldStatus>
          ) : null}
        </div>
        <div className={fields.field}>
          <label className={fields.label} htmlFor="city">
            {it.schoolAccessCity}
          </label>
          <input
            id="city"
            className={fields.input}
            autoComplete="address-level2"
            aria-invalid={Boolean(errors.city)}
            aria-describedby={errors.city ? "city-error" : undefined}
            {...form.register("city")}
          />
          {errors.city?.message ? (
            <FieldStatus id="city-error" tone="danger">
              {errors.city.message}
            </FieldStatus>
          ) : null}
        </div>
        <fieldset className={fields.field}>
          <legend className={fields.label}>{it.schoolAccessRole}</legend>
          <label className={fields.radio}>
            <input type="radio" value="INSTITUTE_REPRESENTATIVE" {...form.register("requesterRole")} />
            {it.schoolAccessRoleInstitute}
          </label>
          <label className={fields.radio}>
            <input type="radio" value="TEACHER" {...form.register("requesterRole")} />
            {it.schoolAccessRoleTeacher}
          </label>
          <label className={fields.radio}>
            <input type="radio" value="OTHER" {...form.register("requesterRole")} />
            {it.schoolAccessRoleOther}
          </label>
          {errors.requesterRole?.message ? (
            <FieldStatus id="requesterRole-error" tone="danger">
              {errors.requesterRole.message}
            </FieldStatus>
          ) : null}
        </fieldset>
        <div className={fields.field}>
          <label className={fields.label} htmlFor="institutionalEmail">
            {it.schoolAccessInstitutionalEmail}
          </label>
          <input
            id="institutionalEmail"
            className={fields.input}
            type="email"
            aria-invalid={Boolean(errors.institutionalEmail)}
            aria-describedby={errors.institutionalEmail ? "institutionalEmail-error" : undefined}
            {...form.register("institutionalEmail")}
          />
          {errors.institutionalEmail?.message ? (
            <FieldStatus id="institutionalEmail-error" tone="danger">
              {errors.institutionalEmail.message}
            </FieldStatus>
          ) : null}
        </div>
        <div className={fields.field}>
          <label className={fields.label} htmlFor="editionId">
            {it.schoolAccessCompetition}
          </label>
          <select
            id="editionId"
            className={fields.select}
            aria-invalid={Boolean(errors.editionId)}
            aria-describedby={errors.editionId ? "editionId-error" : undefined}
            {...form.register("editionId")}
          >
            <option value="">{it.schoolAccessCompetitionPlaceholder}</option>
            {editions.map((edition) => (
              <option key={edition.id} value={edition.id}>
                {edition.label}
              </option>
            ))}
          </select>
          {errors.editionId?.message ? (
            <FieldStatus id="editionId-error" tone="danger">
              {errors.editionId.message}
            </FieldStatus>
          ) : null}
        </div>
      </fieldset>

      <div className={fields.actions}>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? it.schoolAccessSubmitting : it.schoolAccessSubmit}
        </Button>
      </div>
    </form>
  );
}
