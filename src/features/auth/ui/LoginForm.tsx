"use client";

import { useActionState } from "react";
import { loginAction } from "@/features/auth/actions";
import Link from "next/link";
import { Button } from "@/shared/ui/Button";
import { ActionError } from "@/shared/ui/ActionError";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

export function LoginForm({ nextPath = "/area" }: { nextPath?: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);

  return (
    <form action={action} className={fields.form} noValidate aria-busy={pending}>
      <input type="hidden" name="next" value={nextPath} />
      <div className={fields.field}>
        <label className={fields.label} htmlFor="email">
          {it.email}
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className={fields.input} />
      </div>

      <div className={fields.field}>
        <label className={fields.label} htmlFor="password">
          {it.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          className={fields.input}
        />
      </div>

      {state?.error ? <ActionError error={state.error} code={state.code} /> : null}

      <div className={fields.actions}>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? it.signingIn : it.submitLogin}
        </Button>
      </div>
      <p>
        <Link href="/recupera-password" className={fields.textLink}>
          {it.forgotPassword}
        </Link>
      </p>
    </form>
  );
}
