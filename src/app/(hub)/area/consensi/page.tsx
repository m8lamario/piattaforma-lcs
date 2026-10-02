import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { maybeSendC1Reminder } from "@/features/consents/data/tokens";
import { boxesFor, isBoxActive, latestChoices, revocableCodes } from "@/features/consents/domain/boxes";
import { ConsentsManager } from "@/features/consents/ui/ConsentsManager";
import { PublicationChips } from "@/features/consents/ui/PublicationChips";
import { loadPlayerWorkspace } from "@/features/registrations/data/workspace";
import { PageHeader } from "@/shared/ui/PageHeader";
import { it } from "@/shared/i18n/it";
import styles from "../comunicazioni/page.module.css";

export default async function ConsentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/accedi?next=/area/consensi");
  const workspace = await loadPlayerWorkspace(session.user.id);
  if (!workspace) redirect("/area");
  void maybeSendC1Reminder(workspace.registration.id).catch(() => undefined);

  const map = latestChoices(workspace.choices);
  const revocable = new Set(
    revocableCodes(workspace.evidence.isMinor, workspace.partnersPublished).map((box) => box.code),
  );
  const rows = boxesFor({
    isMinor: workspace.evidence.isMinor,
    partnersPublished: workspace.partnersPublished,
  })
    .filter((box) => box.step !== "email" || latestChoices(workspace.choices).has("C1") || workspace.g3 === "OTHER_PARENT")
    .map((box) => {
      const latest = map.get(box.code);
      const active = isBoxActive(box.code, {
        isMinor: workspace.evidence.isMinor,
        needsAgreement: workspace.needsMediaAgreement,
        map,
        marketingOptIn: workspace.marketingOptIn,
      });
      return {
        box,
        accepted: latest?.accepted === true,
        active,
        value: latest?.value,
        revocable: revocable.has(box.code) && latest?.accepted === true,
      };
    });

  return (
    <main className={styles.main}>
      <PageHeader title={it.consentsTitle} description={it.consentsHelp} />
      <p style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <PublicationChips flags={workspace.publication} />
      </p>
      <ConsentsManager rows={rows} />
    </main>
  );
}
