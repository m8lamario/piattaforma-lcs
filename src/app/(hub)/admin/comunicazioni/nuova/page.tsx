import { ManualSendForm } from "@/features/emails/ui/ManualSendForm";
import { searchEmailRecipients, getEmailRecipient } from "@/features/emails/data/catalog";
import { isMinor } from "@/features/players/domain/age";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { PageHeader } from "@/shared/ui/PageHeader";
import { authorize } from "@/shared/authz/authorize";
import { requireStaff } from "@/shared/authz/requireStaff";
import { it } from "@/shared/i18n/it";
import Link from "next/link";

type Props = {
  searchParams: Promise<{ q?: string; userId?: string }>;
};

export default async function AdminEmailNewPage({ searchParams }: Props) {
  const { actor } = await requireStaff("/admin/comunicazioni/nuova");
  const query = await searchParams;
  const q = query.q?.trim() ?? "";
  const [recipients, selected] = await Promise.all([
    q.length >= 2 ? searchEmailRecipients(q) : Promise.resolve([]),
    query.userId ? getEmailRecipient(query.userId) : Promise.resolve(null),
  ]);
  return (
    <AdminFrame path="/admin/comunicazioni/nuova">
      <p>
        <Link href="/admin/comunicazioni">{it.adminEmailBack}</Link>
      </p>
      <PageHeader title={it.adminEmailsNew} description={it.adminEmailsHelp} />
      <ManualSendForm
        recipients={recipients}
        selected={selected}
        q={q}
        canCompose={authorize(actor, "email:compose").allow}
        copyGuardianAllowed={Boolean(
          selected?.playerProfile?.birthDate &&
            isMinor(selected.playerProfile.birthDate) &&
            selected.playerProfile.guardians[0]?.email,
        )}
        idempotencyKey={crypto.randomUUID()}
      />
    </AdminFrame>
  );
}
