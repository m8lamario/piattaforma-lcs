import Link from "next/link";
import { prisma } from "@/shared/lib/prisma";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { requireStaff } from "@/shared/authz/requireStaff";
import { PageHeader } from "@/shared/ui/PageHeader";
import { it } from "@/shared/i18n/it";
import styles from "@/features/admin/ui/admin.module.css";

type Props = { searchParams: Promise<{ done?: string }> };

export default async function AdminSchoolsPage({ searchParams }: Props) {
  const query = await searchParams;
  const [{ actor }, schools] = await Promise.all([
    requireStaff("/admin/scuole"),
    prisma.school.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { teams: true } } },
    }),
  ]);

  return (
    <AdminFrame path="/admin/scuole" actor={actor}>
      <PageHeader title={it.schoolListTitle} description={it.schoolListHelp} />
      {query.done === "deleted" ? <p role="status">{it.schoolLifecycleDoneDeleted}</p> : null}
      {schools.length === 0 ? (
        <p className={styles.empty}>{it.schoolLifecycleEmpty}</p>
      ) : (
        <ul className={styles.list}>
          {schools.map((school) => (
            <li key={school.id}>
              <Link href={`/admin/scuole/${school.id}`} className={styles.item}>
                <span>
                  <strong>{school.name}</strong>
                  <span className={styles.meta}>
                    {school.city ? `${school.city} · ` : ""}
                    {school._count.teams} squadre
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AdminFrame>
  );
}
