import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AdminSubnav } from "./AdminSubnav";
import { authorize } from "@/shared/authz/authorize";
import { requireStaff, requireStaffOrReviewer } from "@/shared/authz/requireStaff";
import { isStaff, isMedicalReviewer } from "@/shared/authz/getActor";
import type { Actor } from "@/shared/authz/types";
import { legalFilesHavePlaceholders } from "@/shared/lib/legal";
import { it } from "@/shared/i18n/it";
import styles from "./admin.module.css";

type Props = {
  path: string;
  children: ReactNode;
  allowReviewer?: boolean;
  actor?: Actor;
};

export async function AdminFrame({ path, children, allowReviewer = false, actor }: Props) {
  const resolved =
    actor ??
    (allowReviewer ? await requireStaffOrReviewer(path) : await requireStaff(path)).actor;
  const reviewerOnly = isMedicalReviewer(resolved) && !isStaff(resolved);
  if (reviewerOnly && !path.startsWith("/admin/documenti")) {
    redirect("/admin/documenti");
  }
  const placeholders = await legalFilesHavePlaceholders();

  return (
    <main className={styles.main}>
      {placeholders ? <p className={styles.banner}>{it.adminLegalBanner}</p> : null}
      <AdminSubnav
        pathname={path}
        showAccounts={authorize(resolved, "platform:admin").allow}
        reviewerOnly={reviewerOnly}
      />
      {children}
    </main>
  );
}
