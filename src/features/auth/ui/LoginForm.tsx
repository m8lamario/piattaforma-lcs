"use client";

import { useActionState } from "react";
import { loginAction } from "@/features/auth/actions";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import styles from "./LoginForm.module.css";

export function LoginForm({ nextPath = "/area" }: { nextPath?: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);

  return (
    <form action={action} className={styles.form} noValidate>
      <input type="hidden" name="next" value={nextPath} />
      <label className={styles.label} htmlFor="email">
        {it.email}
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        className={styles.input}
      />

      <label className={styles.label} htmlFor="password">
        {it.password}
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        minLength={8}
        className={styles.input}
      />

      {state?.error ? (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Accesso in corso…" : it.submitLogin}
      </Button>
    </form>
  );
}
