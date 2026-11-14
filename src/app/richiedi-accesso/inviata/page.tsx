import Link from "next/link";
import { loadUserEmailDelivery, USER_EMAIL_OPS } from "@/features/emails/data/userDelivery";
import { readSchoolAccessCookieRequestId } from "@/features/school-access/data/cookie";
import { getSchoolAccessRequest } from "@/features/school-access/data/requests";
import { SchoolAccessResendPanel } from "@/features/school-access/ui/SchoolAccessResendPanel";
import { it } from "@/shared/i18n/it";
import { PublicShell } from "@/shared/ui/PublicShell";
import styles from "../page.module.css";

export default async function SchoolAccessSentPage() {
  const requestId = await readSchoolAccessCookieRequestId();
  const request = requestId ? await getSchoolAccessRequest(requestId) : null;
  const pendingApproval = request?.status === "PENDING";
  const canActivate = request?.status === "APPROVED" && !request.activatedAt && !request.user?.passwordHash;
  const delivery =
    request && canActivate
      ? await loadUserEmailDelivery(USER_EMAIL_OPS.schoolActivate(request.id, request.email))
      : null;

  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.sheet}>
          <p className={styles.kicker}>{it.landingSchoolKicker}</p>
          <h1>{it.schoolAccessSentTitle}</h1>
          <p className={styles.lead}>{it.schoolAccessSentLead}</p>
          {request && (pendingApproval || canActivate) ? (
            <SchoolAccessResendPanel
              email={request.email}
              pendingApproval={Boolean(pendingApproval)}
              deliveryState={delivery?.state ?? null}
              remainingResends={delivery?.remainingResends ?? 0}
              contactSupport={delivery?.contactSupport ?? false}
              resendAvailableAt={delivery?.resendAvailableAt?.toISOString() ?? null}
            />
          ) : null}
          <Link href="/" className={styles.back}>
            {it.backHome}
          </Link>
        </section>
      </main>
    </PublicShell>
  );
}
