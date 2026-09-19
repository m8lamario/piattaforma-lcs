import Link from "next/link";
import {
  listPendingMedicalDocuments,
  listRecentReviewedMedicalDocuments,
} from "@/features/documents/data/documents";
import { isStaff, representativeTeamIds } from "@/shared/authz/getActor";
import { requireStaff } from "@/shared/authz/requireStaff";
import { AppShell } from "@/shared/ui/AppShell";
import { it } from "@/shared/i18n/it";
import styles from "./page.module.css";

function playerName(document: {
  playerProfile: { firstName: string; lastName: string };
}) {
  return `${document.playerProfile.firstName} ${document.playerProfile.lastName}`.trim();
}

function statusLabel(status: string) {
  if (status === "APPROVED") return it.statusDocumentAPPROVED;
  if (status === "REJECTED") return it.statusDocumentREJECTED;
  return it.statusDocumentPENDING_REVIEW;
}

export default async function AdminDocumentsPage() {
  const { session, actor } = await requireStaff("/admin/documenti");
  const [pending, recent] = await Promise.all([
    listPendingMedicalDocuments(),
    listRecentReviewedMedicalDocuments(),
  ]);

  return (
    <AppShell
      email={session.user?.email}
      showTeam={representativeTeamIds(actor).length > 0}
      showAdmin={isStaff(actor)}
    >
      <main className={styles.main}>
        <section className={styles.hero}>
          <h1>{it.adminDocumentsTitle}</h1>
          <p>{it.adminDocumentsHelp}</p>
        </section>

        {pending.length === 0 ? (
          <p role="status">{it.adminDocumentsEmpty}</p>
        ) : (
          <ul className={styles.list}>
            {pending.map((document) => (
              <li key={document.id}>
                <Link href={`/admin/documenti/${document.id}`} className={styles.item}>
                  <strong>{playerName(document)}</strong>
                  <span>
                    {document.registration.team.name} · {statusLabel(document.status)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {recent.length > 0 ? (
          <section>
            <h2>{it.adminRecentDocuments}</h2>
            <ul className={styles.list}>
              {recent.map((document) => (
                <li key={document.id}>
                  <Link href={`/admin/documenti/${document.id}`} className={styles.item}>
                    <strong>{playerName(document)}</strong>
                    <span>
                      {document.registration.team.name} · {statusLabel(document.status)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </AppShell>
  );
}
