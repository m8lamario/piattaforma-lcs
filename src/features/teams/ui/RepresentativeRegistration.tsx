"use client";

import { useSyncExternalStore } from "react";
import { PersonalDataForm } from "@/features/players/ui/PersonalDataForm";
import { PersonalRegistrationPanel } from "@/features/registrations/ui/PersonalRegistrationPanel";
import type { PlayerWorkspace } from "@/features/registrations/data/workspace";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import styles from "./RepresentativeDashboard.module.css";
import {
  readRepresentativeFlowOpen,
  subscribeRepresentativeFlow,
  writeRepresentativeFlow,
} from "./representativeFlow";

type Category = "PLAYER" | "STAFF";

type Props = {
  teamId: string;
  category: Category;
  workspace: PlayerWorkspace;
};

export function RepresentativeRegistration({ teamId, category, workspace }: Props) {
  const settled =
    workspace.projectedStatus === "APPROVED" ||
    workspace.projectedStatus === "WITHDRAWN" ||
    workspace.projectedStatus === "REMOVED";
  const storedOpen = useSyncExternalStore(
    subscribeRepresentativeFlow,
    () => readRepresentativeFlowOpen(teamId),
    () => false,
  );
  const open = settled ? false : storedOpen;
  const personalOpen = workspace.checklist.some(
    (item) => item.code === "PERSONAL_DATA" && (item.status === "todo" || item.status === "attention"),
  );

  function pause() {
    writeRepresentativeFlow(teamId, "paused");
  }

  function resume() {
    writeRepresentativeFlow(teamId, "open");
  }

  if (settled) {
    return (
      <PersonalRegistrationPanel
        status={workspace.projectedStatus}
        checklist={workspace.checklist}
        medicalStatus={workspace.evidence.medicalStatus}
        category={workspace.registration.category}
        publication={workspace.publication}
        shirtSizeDue={workspace.shirtSizeOnlyGap}
      />
    );
  }

  if (!open) {
    return (
      <div className={styles.flowBar}>
        <p className={styles.lead}>{it.repRolePaused}</p>
        <Button type="button" onClick={resume}>
          {it.repRoleResume}
        </Button>
      </div>
    );
  }

  if (personalOpen) {
    return (
      <PersonalDataForm
        email={workspace.user.email}
        defaults={workspace.profile}
        registrationId={workspace.registration.id}
        identityConflict={workspace.identityConflict}
        requireShirtSize={category === "PLAYER"}
        returnToArea
        onPause={pause}
      />
    );
  }

  return (
    <>
      <div className={styles.flowBar}>
        <p className={styles.lead}>{it.repRoleStepsOpen}</p>
        <Button type="button" variant="ghost" onClick={pause}>
          {it.repRolePause}
        </Button>
      </div>
      <PersonalRegistrationPanel
        status={workspace.projectedStatus}
        checklist={workspace.checklist}
        medicalStatus={workspace.evidence.medicalStatus}
        category={workspace.registration.category}
        publication={workspace.publication}
        shirtSizeDue={workspace.shirtSizeOnlyGap}
      />
    </>
  );
}
