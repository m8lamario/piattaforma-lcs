import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AccountPasswordForm } from "@/features/auth/ui/AccountPasswordForm";
import { PageHeader } from "@/shared/ui/PageHeader";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
import styles from "../comunicazioni/page.module.css";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/accedi?next=/area/account");

  return (
    <main className={styles.main}>
      <PageHeader title={it.accountTitle} />
      <p className={fields.readonly}>
        {it.emailReadOnly}: <strong>{session.user.email}</strong>
      </p>
      <AccountPasswordForm />
    </main>
  );
}
