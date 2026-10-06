import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { loadAppShell } from "@/shared/ui/loadAppShell";
import { authorize } from "@/shared/authz/authorize";
import { GuardianForm } from "@/features/players/ui/GuardianForm";
import { PersonalDataForm } from "@/features/players/ui/PersonalDataForm";
import { loadPlayerWorkspace } from "@/features/registrations/data/workspace";
import { isTerminalRegistrationStatus } from "@/features/registrations/domain/requirements";
import {
  gateWizardStep,
  isWizardStepId,
  visibleWizardSteps,
} from "@/features/registrations/domain/wizard";
import { getCurrentLegalVersions } from "@/features/consents/data/legal";
import { MEDIA_RELEASE_SLUG, privacySlugsFor } from "@/features/consents/domain/pack";
import { CONSENT_BOXES, mediaFormBoxes, privacyExtraBoxes } from "@/features/consents/domain/boxes";
import { maybeSendC1Reminder } from "@/features/consents/data/tokens";
import { maybeSendGuardianReminder } from "@/features/consents/data/guardianAuth";
import { MediaConsentForm } from "@/features/consents/ui/MediaConsentForm";
import { PrivacyConsentForm } from "@/features/consents/ui/PrivacyConsentForm";
import { GuardianWaitingView } from "@/features/consents/ui/GuardianWaitingView";
import { EmailVerifyNotice } from "@/features/auth/ui/EmailVerifyNotice";
import { MedicalUploadForm } from "@/features/documents/ui/MedicalUploadForm";
import { playerCheckoutAmount } from "@/features/payments/domain/amounts";
import { PlayerPaymentForm } from "@/features/payments/ui/PlayerPaymentForm";
import { isPaymentCovered } from "@/features/registrations/domain/requirements";
import { PlaceholderStep } from "@/features/registrations/ui/PlaceholderStep";
import { SummaryStep } from "@/features/registrations/ui/SummaryStep";
import { WizardShell } from "@/features/registrations/ui/WizardShell";
import { WindowNotice } from "@/features/registrations/ui/WindowNotice";
import { it } from "@/shared/i18n/it";

type Props = {
  params: Promise<{ step: string }>;
};

export default async function WizardStepPage({ params }: Props) {
  const { step: raw } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/accedi?next=/area/registrazione/${raw}`);
  }

  const [shell, workspace] = await Promise.all([
    loadAppShell(session.user.id),
    loadPlayerWorkspace(session.user.id),
  ]);
  if (!workspace) redirect("/area");

  const allowed = authorize(shell.actor ?? { userId: session.user.id, roles: [], membershipTeamIds: [] }, "registration:read", {
    ownerUserId: session.user.id,
    teamId: workspace.registration.teamId,
  });
  if (!allowed.allow) redirect("/area");
  if (isTerminalRegistrationStatus(workspace.registration.status)) {
    redirect("/area");
  }

  if (!isWizardStepId(raw)) {
    redirect("/area/registrazione");
  }

  const gated = gateWizardStep(raw, workspace.checklist);
  if (gated !== raw) {
    redirect(`/area/registrazione/${gated}`);
  }

  void maybeSendC1Reminder(workspace.registration.id).catch(() => undefined);
  void maybeSendGuardianReminder(workspace.registration.id).catch(() => undefined);

  const steps = visibleWizardSteps(workspace.checklist);
  const privacySlugs = privacySlugsFor(workspace.evidence.isMinor);
  const legalVersions = await getCurrentLegalVersions([...privacySlugs, MEDIA_RELEASE_SLUG]);
  const toView = (slug: string) => {
    const version = legalVersions.find((entry) => entry.legalDocument.slug === slug);
    if (!version) return null;
    return {
      slug,
      title: version.legalDocument.title,
      version: version.version,
      versionId: version.id,
      body: version.body,
    };
  };

  let body;
  switch (raw) {
    case "dati":
      body = (
        <PersonalDataForm
          email={workspace.user.email}
          defaults={workspace.profile}
          registrationId={workspace.registration.id}
          identityConflict={workspace.identityConflict}
        />
      );
      break;
    case "tutore":
      body = (
        <GuardianForm
          defaults={{
            firstName: workspace.guardian?.firstName ?? "",
            lastName: workspace.guardian?.lastName ?? "",
            relationship: workspace.guardian?.relationship ?? "GENITORE",
            email: workspace.guardian?.email ?? "",
            phone: workspace.guardian?.phone ?? "",
            g3: workspace.g3,
            secondFirstName: workspace.secondGuardian?.firstName ?? "",
            secondLastName: workspace.secondGuardian?.lastName ?? "",
            secondEmail: workspace.secondGuardian?.email ?? "",
          }}
        />
      );
      break;
    case "certificato":
      body = <MedicalUploadForm document={workspace.medicalDocument} />;
      break;
    case "privacy": {
      const documents = privacySlugs
        .map(toView)
        .filter((item): item is NonNullable<ReturnType<typeof toView>> => item !== null);
      const extraBoxes = privacyExtraBoxes(workspace.evidence.isMinor, workspace.partnersPublished);
      const currentBoxes = Object.fromEntries(workspace.choices.map((row) => [row.code, row.accepted]));
      if (workspace.evidence.isMinor) {
        const waitBoxes = CONSENT_BOXES.filter(
          (box) => box.path !== "adult" && (box.step === "privacy" || box.step === "guardian"),
        ).filter((box) => !box.partnersOnly || workspace.partnersPublished);
        body =
          documents.length === privacySlugs.length ? (
            <GuardianWaitingView
              status={workspace.guardianAuthorization}
              documents={documents}
              boxes={waitBoxes}
              currentBoxes={currentBoxes}
            />
          ) : (
            <PlaceholderStep title={it.stepPrivacy} body={it.placeholderPrivacy} />
          );
        break;
      }
      body =
        documents.length === privacySlugs.length ? (
          <PrivacyConsentForm
            documents={documents}
            extraBoxes={extraBoxes}
            currentBoxes={currentBoxes}
            registrationId={workspace.registration.id}
          />
        ) : (
          <PlaceholderStep title={it.stepPrivacy} body={it.placeholderPrivacy} />
        );
      break;
    }
    case "liberatorie": {
      const media = toView(MEDIA_RELEASE_SLUG);
      const uses = mediaFormBoxes(workspace.evidence.isMinor, workspace.needsMediaAgreement);
      const currentUses = Object.fromEntries(workspace.choices.map((row) => [row.code, row.accepted]));
      if (workspace.evidence.isMinor) {
        const mediaUses = uses.filter((box) => box.code !== "G14");
        const g14 = uses.filter((box) => box.code === "G14");
        body = media ? (
          <>
            <GuardianWaitingView
              status={workspace.guardianAuthorization}
              documents={[media]}
              boxes={mediaUses}
              currentBoxes={currentUses}
            />
            {g14.length > 0 ? (
              <MediaConsentForm document={media} uses={g14} currentUses={currentUses} submitted={Boolean(currentUses.G14)} />
            ) : null}
          </>
        ) : (
          <PlaceholderStep title={it.stepLiberatorie} body={it.placeholderMedia} />
        );
        break;
      }
      body = media ? (
        <MediaConsentForm
          document={media}
          uses={uses}
          currentUses={currentUses}
          submitted={workspace.evidence.mediaDecision === "submitted"}
        />
      ) : (
        <PlaceholderStep title={it.stepLiberatorie} body={it.placeholderMedia} />
      );
      break;
    }
    case "pagamento":
      body = (
        <PlayerPaymentForm
          covered={isPaymentCovered(workspace.evidence.payment)}
          teamOnly={workspace.registration.paymentMode === "TEAM"}
          amount={playerCheckoutAmount({
            paymentMode: workspace.registration.paymentMode,
            playerFeeAmount: workspace.registration.playerFeeAmount,
          })}
          currency={workspace.registration.currency}
        />
      );
      break;
    case "riepilogo":
      body = (
        <SummaryStep
          checklist={workspace.checklist}
          isMinor={workspace.evidence.isMinor}
          guardianStatus={workspace.guardianAuthorization}
          choices={workspace.choices}
        />
      );
      break;
  }

  return (
    <>
      <WindowNotice
        edition={{
          isActive: workspace.registration.isActive,
          registrationOpensAt: workspace.registration.registrationOpensAt,
          registrationClosesAt: workspace.registration.registrationClosesAt,
        }}
      />
      {!workspace.user.emailVerified ? <EmailVerifyNotice /> : null}
      <WizardShell step={raw} steps={steps} checklist={workspace.checklist}>
        {body}
      </WizardShell>
    </>
  );
}
