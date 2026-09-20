import type { ReactNode } from "react";
import { AdminSubnav } from "./AdminSubnav";
import { authorize } from "@/shared/authz/authorize";
import { requireStaff } from "@/shared/authz/requireStaff";
import { legalFilesHavePlaceholders } from "@/shared/lib/legal";
import { it } from "@/shared/i18n/it";
import styles from "./admin.module.css";

type Props = {
  path: string;
  children: ReactNode;
};

export async function AdminFrame({ path, children }: Props) {
  const { actor } = await requireStaff(path);
  const placeholders = await legalFilesHavePlaceholders();

  return (
    <main className={styles.main}>
      {placeholders ? <p className={styles.banner}>{it.adminLegalBanner}</p> : null}
      <AdminSubnav pathname={path} showAccounts={authorize(actor, "platform:admin").allow} />
      {children}
    </main>
  );
}
