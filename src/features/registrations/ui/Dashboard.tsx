import type { PublicationFlags } from "@/features/consents/domain/boxes";
import type {
  ChecklistItem,
  MedicalEvidence,
  RegistrationStatus,
} from "@/features/registrations/domain/requirements";
import type { SportEligibilityReason } from "@/features/registrations/domain/eligibility";
import { nextHero, type NextHero } from "@/features/registrations/domain/wizard";
import { it } from "@/shared/i18n/it";
import { ButtonLink } from "@/shared/ui/Button";
import { Icon } from "@/shared/ui/Icon";
import { NextStepHero } from "@/shared/ui/NextStepHero";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Panel } from "@/shared/ui/Panel";
import { ProgressMeter } from "@/shared/ui/ProgressMeter";
import { registrationStatusLabel, registrationStatusTone } from "@/features/registrations/domain/statusCopy";
import { StatusChip } from "@/shared/ui/StatusChip";
import { IdentityConflictPanel } from "@/features/players/ui/IdentityConflictPanel";
import { GuardianEmailAlert } from "@/features/consents/ui/GuardianEmailAlert";
import type { GuardianResendTarget } from "@/features/players/ui/GuardianResendButton";
import {
  hasUndeliverableGuardianEmail,
  type GuardianEmailNotice,
} from "@/features/consents/domain/guardianEmail";
import { WindowChip, WindowNotice } from "@/features/registrations/ui/WindowNotice";
import { isRegistrationWindowOpen, type EditionWindow } from "@/features/registrations/domain/window";
import { medicalKindLabel, type MedicalCertificateKind } from "@/features/documents/domain/medicalRequirement";
import { ChecklistLinks } from "./ChecklistLinks";
import { dashboardChecklistTone } from "./dashboardChecklist";
import { REQUIREMENT_STEP } from "./wizardCopy";
import fields from "@/shared/ui/form.module.css";
import styles from "./Dashboard.module.css";

function eligibilityNotice(reason: SportEligibilityReason | undefined, deadlineLabel: string | null) {
  if (!reason || reason === "eligible" || reason === "staff") return null;
  if (reason === "deadline") return it.medicalDeadlineOverdue;
  if (reason === "rejected") return it.medicalRejected;
  if (reason === "expired") return it.medicalExpired;
  if (reason === "pending") return it.medicalPending;
  if (deadlineLabel) return it.medicalDeadlineDue.replace("{date}", deadlineLabel);
  return it.medicalDeadlineUnknown;
}

function heroText(
  hero: NextHero,
  medicalStatus?: MedicalEvidence,
  guardian?: { authorization?: "none" | "pending" | "authorized" | "refused"; notices: GuardianEmailNotice[] },
) {
  if (hero.code === "DONE") return it.heroDone;
  if (hero.code === "PERSONAL_DATA") return it.heroPersonal;
  if (hero.code === "GUARDIAN_IF_MINOR") {
    const primaryBounce = guardian?.notices.some(
      (notice) => notice.kind === "primary" && notice.reason === "undeliverable",
    );
    if (primaryBounce) return it.heroGuardianUndeliverable;
    if (guardian?.authorization === "pending") return it.heroGuardianPending;
    return it.heroGuardian;
  }
  if (hero.code === "MEDICAL_CERT") {
    if (hero.status === "attention") {
      if (medicalStatus === "rejected" || medicalStatus === "expired") {
        return it.heroMedicalRejected;
      }
      return it.heroMedicalPending;
    }
    return hero.implemented ? it.heroMedical : it.heroMedicalSoon;
  }
  if (hero.code === "PRIVACY") return hero.implemented ? it.heroPrivacy : it.heroPrivacySoon;
  if (hero.code === "MEDIA_RELEASE") return hero.implemented ? it.heroMedia : it.heroMediaSoon;
  return hero.implemented ? it.heroPayment : it.heroPaymentSoon;
}

type Props = {
  competitionName: string;
  editionName: string;
  teamName: string;
  status: RegistrationStatus;
  checklist: ChecklistItem[];
  medicalStatus?: MedicalEvidence;
  sportEligible?: boolean;
  medicalDeadline?: Date | null;
  eligibilityReason?: SportEligibilityReason;
  registrationId: string;
  editionWindow: EditionWindow;
  identityConflict?: { code: string } | null;
  category?: "PLAYER" | "STAFF";
  shirtSizeDue?: boolean;
  medicalCertificateKind?: MedicalCertificateKind;
  guardianAuthorization?: "none" | "pending" | "authorized" | "refused";
  guardianNotices?: GuardianEmailNotice[];
  publication?: PublicationFlags | null;
  guardianResend?: GuardianResendTarget | null;
};

export function RegistrationDashboard({
  competitionName,
  editionName,
  teamName,
  status,
  checklist,
  medicalStatus,
  sportEligible = true,
  medicalDeadline = null,
  eligibilityReason,
  registrationId,
  editionWindow,
  identityConflict,
  category = "PLAYER",
  shirtSizeDue = false,
  medicalCertificateKind,
  guardianAuthorization,
  guardianNotices = [],
  publication = null,
  guardianResend = null,
}: Props) {
  const hero = nextHero(checklist);
  const hrefStep = hero.code === "DONE" ? "riepilogo" : (REQUIREMENT_STEP[hero.code] ?? "dati");
  const visible = checklist.filter((item) => item.status !== "not_applicable");
  const doneCount = visible.filter((item) => item.status === "complete").length;
  const blocked = Boolean(identityConflict);
  const playBlocked = category === "PLAYER" && !sportEligible;
  const approved = status === "APPROVED" && (category === "STAFF" || sportEligible);
  const closed = status === "WITHDRAWN" || status === "REMOVED";
  const checklistDoneButNotEligible = hero.code === "DONE" && playBlocked;
  const bounceNotices = guardianNotices.filter((notice) => notice.reason === "undeliverable");
  const guardianMailProblem = hasUndeliverableGuardianEmail(bounceNotices);
  const publicationPending =
    publication?.status === "pending_other_parent" && guardianAuthorization === "authorized";
  const settled =
    !guardianMailProblem &&
    !checklistDoneButNotEligible &&
    (hero.code === "DONE" || approved || closed || blocked);
  const deadlineLabel = medicalDeadline
    ? medicalDeadline.toLocaleDateString("it-IT", { dateStyle: "long" })
    : null;
  const notice = playBlocked ? eligibilityNotice(eligibilityReason, deadlineLabel) : null;
  const heroCopy = blocked
    ? it.identityHeroBlocked
    : status === "WITHDRAWN"
      ? it.heroWithdrawn
      : status === "REMOVED"
        ? it.heroRemoved
        : checklistDoneButNotEligible
          ? (notice ?? it.heroMedical)
          : shirtSizeDue
            ? it.heroShirtSize
            : status === "APPROVED" && sportEligible
              ? it.heroApproved
              : hero.code === "DONE"
                ? it.heroPendingNow
                : heroText(hero, medicalStatus, { authorization: guardianAuthorization, notices: bounceNotices });
  const continueHref = guardianMailProblem
    ? "/area/registrazione/tutore"
    : checklistDoneButNotEligible
      ? "/area/registrazione/certificato"
      : `/area/registrazione/${hrefStep}`;
  const heroKicker = blocked
    ? it.wizardStepAttention
    : approved
      ? it.statusAPPROVED
      : closed
        ? registrationStatusLabel(status)
        : hero.code === "DONE"
          ? it.statusPENDING_REVIEW
          : it.repNextKicker;
  const progressLabel = it.checklistProgress
    .replace("{done}", String(doneCount))
    .replace("{total}", String(visible.length));

  return (
    <div className={styles.canvas}>
      <PageHeader
        kicker={`${competitionName} · ${editionName}`}
        title={category === "STAFF" ? it.staffAreaTitle : it.areaTitle}
        description={`${category === "STAFF" ? it.categoryStaff : it.categoryPlayer} · ${it.teamTitle}: ${teamName}`}
        aside={
          <div className={styles.chips}>
            <StatusChip tone={registrationStatusTone(status)}>{registrationStatusLabel(status)}</StatusChip>
            {category === "PLAYER" ? (
              <StatusChip tone={sportEligible ? "complete" : "attention"}>
                {sportEligible ? it.medicalEligibilityYes : it.medicalEligibilityNo}
              </StatusChip>
            ) : null}
            {isRegistrationWindowOpen(editionWindow) ? <WindowChip edition={editionWindow} /> : null}
          </div>
        }
      />

      {isRegistrationWindowOpen(editionWindow) ? null : <WindowNotice edition={editionWindow} />}

      {blocked ? <IdentityConflictPanel registrationId={registrationId} /> : null}
      {notice && notice !== heroCopy ? (
        <p className={`${fields.banner} ${fields.bannerWarn}`} role="status">
          {notice}
        </p>
      ) : null}
      <NextStepHero
        kicker={heroKicker}
        icon={approved ? "check" : blocked || playBlocked ? "alert" : hero.code === "DONE" ? "clock" : "zap"}
        tone={
          blocked || shirtSizeDue || playBlocked || guardianMailProblem
            ? "warning"
            : approved
              ? "done"
              : "default"
        }
        title={heroCopy}
        actions={
          settled ? (
            hero.code === "DONE" && !blocked && !closed ? (
              <ButtonLink href="/area/registrazione/riepilogo" variant="secondary" icon="summary">
                {it.stepRiepilogo}
              </ButtonLink>
            ) : undefined
          ) : (
            <ButtonLink href={continueHref} icon="chevronRight" iconPosition="right">
              {it.ctaContinue}
            </ButtonLink>
          )
        }
        aside={
          closed || visible.length === 0 ? undefined : (
            <ProgressMeter
              done={doneCount}
              total={visible.length}
              size="lg"
              label={progressLabel}
              caption={it.repNextProgress}
              segments={visible.map((item) => dashboardChecklistTone(item, publicationPending))}
            />
          )
        }
      />

      <GuardianEmailAlert
        notices={bounceNotices}
        href={bounceNotices.length > 0 ? "/area/registrazione/tutore" : undefined}
      />

      {category === "PLAYER" && medicalCertificateKind ? (
        <p className={styles.note}>
          {it.medicalRequiredKind}: <strong>{medicalKindLabel(medicalCertificateKind)}</strong>
        </p>
      ) : null}

      <Panel title={it.checklistTitle} description={progressLabel} icon="fileCheck" flush>
        <ChecklistLinks
          checklist={checklist}
          publicationPending={publicationPending}
          guardianResend={guardianResend}
        />
        <p className={styles.note}>
          <Icon name="info" size={16} />
          <span>{it.guardianEmailNote}</span>
        </p>
      </Panel>
    </div>
  );
}
