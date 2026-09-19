import { notFound } from "next/navigation";
import Link from "next/link";
import { getAdminDocumentView } from "@/features/documents/data/documents";
import { OpenDocumentButton } from "@/features/documents/ui/OpenDocumentButton";
import { ReviewForm } from "@/features/documents/ui/ReviewForm";
import { isStaff, representativeTeamIds } from "@/shared/authz/getActor";
import { requireStaff } from "@/shared/authz/requireStaff";
import { AppShell } from "@/shared/ui/AppShell";
import { it } from "@/shared/i18n/it";
import styles from "./page.module.css";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

function statusLabel(status: string) {
  if (status === "APPROVED") return it.statusDocumentAPPROVED;
  if (status === "REJECTED") return it.statusDocumentREJECTED;
  return it.statusDocumentPENDING_REVIEW;
}

export default async function AdminDocumentDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const { session, actor } = await requireStaff(`/admin/documenti/${id}`);
  const document = await getAdminDocumentView(id);
  if (!document || document.status === "REPLACED") notFound();

  const pending = document.status === "PENDING_REVIEW";
  const rejectReason =
    document.reviews[0]?.decision === "REJECTED" ? document.reviews[0].reason : null;

  return (
    <AppShell
      email={session.user?.email}
      showTeam={representativeTeamIds(actor).length > 0}
      showAdmin={isStaff(actor)}
    >
      <main className={styles.main}>
        <p>
          <Link href="/admin/documenti">{it.adminBackToDocuments}</Link>
        </p>
        <section className={styles.card}>
          <h1>{it.adminDocumentTitle}</h1>
          <p>
            {it.adminPlayer}:{" "}
            <strong>
              {document.playerProfile.firstName} {document.playerProfile.lastName}
            </strong>
          </p>
          <p>
            {it.adminTeam}: <strong>{document.registration.team.name}</strong>
          </p>
          <p role="status">
            {statusLabel(document.status)} · {document.originalFilename}
          </p>
          {rejectReason ? (
            <p>
              {it.medicalRejectReason}: {rejectReason}
            </p>
          ) : null}
          {pending ? (
            <ReviewForm documentId={document.id} reasonRequired={query.error === "reason"} />
          ) : (
            <>
              <p>{it.adminDocumentClosed}</p>
              <OpenDocumentButton documentId={document.id} />
            </>
          )}
        </section>
      </main>
    </AppShell>
  );
}
