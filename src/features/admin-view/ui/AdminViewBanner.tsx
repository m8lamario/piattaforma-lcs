import { endAdminViewAction } from "@/features/admin-view/actions";
import { getRequestIdentity } from "@/shared/authz/requestIdentity";
import { it } from "@/shared/i18n/it";
import { Button } from "@/shared/ui/Button";
import { ReadOnlySubmitGuard } from "./ReadOnlySubmitGuard";
import styles from "./AdminViewBanner.module.css";

export async function AdminViewBanner() {
  const identity = await getRequestIdentity();
  if (!identity?.view) return null;

  return (
    <>
      <div className={styles.banner} data-admin-view-banner role="status">
        <p className={styles.copy}>{it.adminViewBanner.replace("{name}", identity.view.targetName)}</p>
        <form action={endAdminViewAction} data-view-allow="end">
          <Button type="submit" variant="secondary">
            {it.adminViewEnd}
          </Button>
        </form>
        <p className={styles.live} id="admin-view-live" aria-live="polite" />
      </div>
      <ReadOnlySubmitGuard />
    </>
  );
}
