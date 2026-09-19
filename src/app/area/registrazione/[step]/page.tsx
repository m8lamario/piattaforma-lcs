import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getActorByUserId, isStaff, representativeTeamIds } from "@/shared/authz/getActor";
import { authorize } from "@/shared/authz/authorize";
import { GuardianForm } from "@/features/players/ui/GuardianForm";
import { PersonalDataForm } from "@/features/players/ui/PersonalDataForm";
import { loadPlayerWorkspace } from "@/features/registrations/data/workspace";
import {
  gateWizardStep,
  isWizardStepId,
  visibleWizardSteps,
} from "@/features/registrations/domain/wizard";
import { getCurrentLegalVersions } from "@/features/consents/data/legal";
import { MEDIA_RELEASE_SLUG, privacySlugsFor } from "@/features/consents/domain/pack";
import { MediaConsentForm } from "@/features/consents/ui/MediaConsentForm";
import { PrivacyConsentForm } from "@/features/consents/ui/PrivacyConsentForm";
import { MedicalUploadForm } from "@/features/documents/ui/MedicalUploadForm";
import { playerCheckoutAmount } from "@/features/payments/domain/amounts";
import { PlayerPaymentForm } from "@/features/payments/ui/PlayerPaymentForm";
import { isPaymentCovered } from "@/features/registrations/domain/requirements";
import { PlaceholderStep } from "@/features/registrations/ui/PlaceholderStep";
import { SummaryStep } from "@/features/registrations/ui/SummaryStep";
import { WizardShell } from "@/features/registrations/ui/WizardShell";
import { AppShell } from "@/shared/ui/AppShell";
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

  const [actor, workspace] = await Promise.all([
    getActorByUserId(session.user.id),
    loadPlayerWorkspace(session.user.id),
  ]);
  if (!workspace) redirect("/area");

  const allowed = authorize(actor ?? { userId: session.user.id, roles: [], membershipTeamIds: [] }, "registration:read", {
    ownerUserId: session.user.id,
    teamId: workspace.registration.teamId,
  });
  if (!allowed.allow) redirect("/area");

  if (!isWizardStepId(raw)) {
    redirect("/area/registrazione");
  }

  const gated = gateWizardStep(raw, workspace.checklist);
  if (gated !== raw) {
    redirect(`/area/registrazione/${gated}`);
  }

  const steps = visibleWizardSteps(workspace.checklist);
  const showTeam = actor ? representativeTeamIds(actor).length > 0 : false;
  const showAdmin = actor ? isStaff(actor) : false;
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
      body =
        documents.length === privacySlugs.length ? (
          <PrivacyConsentForm documents={documents} />
        ) : (
          <PlaceholderStep title={it.stepPrivacy} body={it.placeholderPrivacy} />
        );
      break;
    }
    case "liberatorie": {
      const media = toView(MEDIA_RELEASE_SLUG);
      const mediaRequired =
        workspace.checklist.find((item) => item.code === "MEDIA_RELEASE")?.required ?? false;
      body = media ? (
        <MediaConsentForm
          document={media}
          required={mediaRequired}
          currentDecision={workspace.evidence.mediaDecision}
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
      body = <SummaryStep checklist={workspace.checklist} />;
      break;
  }

  return (
    <AppShell email={session.user.email} showTeam={showTeam} showAdmin={showAdmin}>
      <WizardShell step={raw} steps={steps}>
        {body}
      </WizardShell>
    </AppShell>
  );
}
