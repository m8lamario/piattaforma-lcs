"use client";

import { useActionState } from "react";
import { redeemInviteAction } from "@/features/teams/actions";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import styles from "./RedeemForm.module.css";

type Props = {
  token: string;
  email: string;
  teamName: string;
  firstName: string | null;
  lastName: string | null;
};

export function RedeemForm({ token, email, teamName, firstName, lastName }: Props) {
  const [state, action, pending] = useActionState(redeemInviteAction, undefined);

  return (
    <form action={action} className={styles.form} noValidate>
      <input type="hidden" name="token" value={token} />
      <p className={styles.lead}>
        Stai per unirti a <strong>{teamName}</strong> con l’email <strong>{email}</strong>.
      </p>
      <label htmlFor="firstName">{it.firstName}</label>
      <input
        id="firstName"
        name="firstName"
        required
        defaultValue={firstName ?? ""}
        autoComplete="given-name"
      />
      <label htmlFor="lastName">{it.lastName}</label>
      <input
        id="lastName"
        name="lastName"
        required
        defaultValue={lastName ?? ""}
        autoComplete="family-name"
      />
      <label htmlFor="password">{it.password}</label>
      <input
        id="password"
        name="password"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
      />
      <label htmlFor="confirmPassword">{it.confirmPassword}</label>
      <input
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
      />
      {state?.error ? (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Creazione account…" : it.submitRedeem}
      </Button>
    </form>
  );
}
