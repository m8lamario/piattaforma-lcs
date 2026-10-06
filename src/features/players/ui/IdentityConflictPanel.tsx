import { WithdrawForm } from "@/features/registrations/ui/WithdrawForm";
import { logoutAction } from "@/features/auth/actions";
import { it } from "@/shared/i18n/it";
import { Button, ButtonLink } from "@/shared/ui/Button";
import styles from "./IdentityConflictPanel.module.css";

type Section = "full" | "alert" | "recovery";

type Props = {
  registrationId: string;
  showFormHint?: boolean;
  section?: Section;
};

export function IdentityConflictPanel({ registrationId, showFormHint = true, section = "full" }: Props) {
  const alert = (
    <>
      <h2 className={styles.title}>{it.identityConflictTitle}</h2>
      <p>{it.identityConflictBody}</p>
    </>
  );

  const recovery = (
    <>
      <ol className={styles.steps}>
        <li>{it.identityConflictTypo}</li>
        <li>{it.identityConflictOriginal}</li>
        <li>{it.identityConflictOrg}</li>
        <li>{it.identityConflictWithdraw}</li>
      </ol>
      <div className={styles.actions}>
        {showFormHint ? (
          <ButtonLink href="/area/registrazione/dati">{it.identityConflictCorrectCta}</ButtonLink>
        ) : null}
        <form action={logoutAction}>
          <Button type="submit" variant="ghost">
            {it.logout}
          </Button>
        </form>
        <WithdrawForm registrationId={registrationId} />
      </div>
      <p className={styles.ref}>
        {it.errorRefLabel}: <code>IDENTITY_FISCAL_CODE_ASSOCIATED</code>
      </p>
    </>
  );

  return (
    <section className={styles.panel} role={section === "recovery" ? undefined : "alert"}>
      {section !== "recovery" ? alert : null}
      {section !== "alert" ? recovery : null}
    </section>
  );
}
