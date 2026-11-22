import type { SchoolChecklistItem } from "@/features/teams/domain/schoolChecklist";
import { Disclosure } from "@/shared/ui/Disclosure";
import type { IconName } from "@/shared/ui/Icon";
import type { StatusTone } from "@/shared/ui/StatusChip";
import { TaskList, type TaskItem } from "@/shared/ui/TaskList";
import { playersLabel } from "@/shared/i18n/format";
import { it } from "@/shared/i18n/it";
import styles from "./RepresentativeDashboard.module.css";

export const SCHOOL_CHECKLIST_COPY: Record<SchoolChecklistItem["id"], string> = {
  email: it.schoolChecklistEmail,
  coach: it.schoolChecklistCoach,
  teamPayment: it.schoolChecklistPayment,
  personal: it.schoolChecklistPersonal,
  guardian: it.schoolChecklistGuardian,
  privacy: it.schoolChecklistPrivacy,
  media: it.schoolChecklistMedia,
  playerPayment: it.schoolChecklistPlayerPayment,
  own: it.schoolChecklistOwn,
  medical: it.schoolChecklistMedical,
};

const ICON: Record<SchoolChecklistItem["id"], IconName> = {
  email: "mail",
  coach: "stopwatch",
  teamPayment: "payment",
  personal: "user",
  guardian: "users",
  privacy: "privacy",
  media: "camera",
  playerPayment: "payment",
  own: "area",
  medical: "medical",
};

const TONE: Record<SchoolChecklistItem["status"], StatusTone> = {
  complete: "complete",
  todo: "todo",
  attention: "attention",
  waiting_on_org: "neutral",
};

const PLAYER_ITEMS = new Set<SchoolChecklistItem["id"]>(["personal", "guardian", "privacy", "media", "playerPayment", "medical"]);

function title(item: SchoolChecklistItem) {
  if (item.id === "teamPayment" && item.status === "waiting_on_org") return it.schoolChecklistPaymentWaiting;
  if (item.id === "guardian" && (item.undeliverableCount ?? 0) > 0) return it.rosterGuardianEmailUndeliverable;
  return SCHOOL_CHECKLIST_COPY[item.id];
}

function status(item: SchoolChecklistItem) {
  if (item.status === "waiting_on_org") return it.schoolChecklistWaitingOrg;
  if (item.status === "attention") return it.wizardStepAttention;
  return undefined;
}

function toTask(item: SchoolChecklistItem): TaskItem {
  const pending = item.status !== "complete" && PLAYER_ITEMS.has(item.id) && item.count > 0;
  return {
    id: item.id,
    title: title(item),
    meta: pending ? playersLabel(item.count) : undefined,
    href: item.status === "waiting_on_org" ? undefined : item.href,
    icon: ICON[item.id],
    tone: TONE[item.status],
    status: status(item),
  };
}

export function SchoolChecklist({ items }: { items: SchoolChecklistItem[] }) {
  const admin = items.filter((item) => item.administrative);
  const open = admin.filter((item) => item.status !== "complete");
  const done = admin.filter((item) => item.status === "complete");
  const medical = items.find((item) => !item.administrative);

  return (
    <div className={styles.checklist}>
      <TaskList
        items={open.map(toTask)}
        empty={<p className={styles.allDone}>{it.repChecklistAllDone}</p>}
      />
      {medical ? (
        <div className={styles.medical}>
          <TaskList
            items={[toTask(medical)]}
          />
          <p className={styles.medicalHelp}>{it.schoolChecklistMedicalHelp}</p>
        </div>
      ) : null}
      {done.length > 0 ? (
        <Disclosure
          summary={it.repChecklistDone.replace("{count}", String(done.length))}
          icon="check"
          className={styles.done}
        >
          <TaskList items={done.map(toTask)} />
        </Disclosure>
      ) : null}
    </div>
  );
}
