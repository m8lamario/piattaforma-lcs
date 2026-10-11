import Link from "next/link";
import { defaultEmailTemplates } from "@/features/emails/domain/templates";
import { EMAIL_TEMPLATE_KEYS } from "@/features/emails/domain/catalog";
import { listEmailTemplateOverrides } from "@/features/emails/data/catalog";
import { TemplateEditForm } from "@/features/emails/ui/TemplateEditForm";
import { AdminFrame } from "@/features/admin/ui/AdminFrame";
import { PageHeader } from "@/shared/ui/PageHeader";
import { authorize } from "@/shared/authz/authorize";
import { requireStaff } from "@/shared/authz/requireStaff";
import { it } from "@/shared/i18n/it";

export default async function AdminEmailTemplatesPage() {
  const [{ actor }, overrides] = await Promise.all([
    requireStaff("/admin/comunicazioni/template"),
    listEmailTemplateOverrides(),
  ]);
  const canEdit = authorize(actor, "email:compose").allow;
  const overrideByKey = new Map(overrides.map((row) => [row.key, row]));
  const defaults = defaultEmailTemplates();
  return (
    <AdminFrame path="/admin/comunicazioni/template" actor={actor}>
      <p>
        <Link href="/admin/comunicazioni">{it.adminEmailBack}</Link>
      </p>
      <PageHeader title={it.adminEmailsTemplates} description={it.adminEmailTemplatesHelp} />
      {!canEdit ? <p>{it.adminEmailTemplateReadonly}</p> : null}
      {EMAIL_TEMPLATE_KEYS.map((key) => {
        const fallback = defaults[key];
        const override = overrideByKey.get(key);
        return (
          <TemplateEditForm
            key={key}
            templateKey={key}
            subject={override?.subject ?? fallback.subject}
            textBody={override?.textBody ?? fallback.textBody}
            canEdit={canEdit}
          />
        );
      })}
    </AdminFrame>
  );
}
