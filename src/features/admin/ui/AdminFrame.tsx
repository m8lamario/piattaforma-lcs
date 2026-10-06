import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AdminSubnav } from "./AdminSubnav";
import { authorize } from "@/shared/authz/authorize";
import { requireStaff, requireStaffOrReviewer } from "@/shared/authz/requireStaff";
import { isStaff, isMedicalReviewer } from "@/shared/authz/getActor";
import { legalFilesHavePlaceholders } from "@/shared/lib/legal";
import { it } from "@/shared/i18n/it";
import styles from "./admin.module.css";

type Props = {
  path: string;
  children: ReactNode;
  allowReviewer?: boolean;
};

export async function AdminFrame({ path, children, allowReviewer = false }: Props) {
  const { actor } = allowReviewer ? await requireStaffOrReviewer(path) : await requireStaff(path);
  const reviewerOnly = isMedicalReviewer(actor) && !isStaff(actor);
  if (reviewerOnly && !path.startsWith("/admin/documenti")) {
    redirect("/admin/documenti");
  }
  const placeholders = await legalFilesHavePlaceholders();

  return (
    <main className={styles.main}>
      {placeholders ? <p className={styles.banner}>{it.adminLegalBanner}</p> : null}
      <AdminSubnav
        pathname={path}
        showAccounts={authorize(actor, "platform:admin").allow}
        reviewerOnly={reviewerOnly}
      />
      {children}
    </main>
  );
}
