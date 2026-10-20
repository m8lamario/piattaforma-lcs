"use client";

import { useSyncExternalStore } from "react";
import { PersonalDataForm } from "@/features/players/ui/PersonalDataForm";
import { PersonalRegistrationPanel } from "@/features/registrations/ui/PersonalRegistrationPanel";
import type { PlayerWorkspace } from "@/features/registrations/data/workspace";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import styles from "./RepresentativeDashboard.module.css";

type Category = "PLAYER" | "STAFF";

function flowKey(teamId: string) {
  return `eph-rep-flow:${teamId}`;
}

const flowListeners = new Set<() => void>();

function subscribeFlow(onStoreChange: () => void) {
  flowListeners.add(onStoreChange);
  return () => flowListeners.delete(onStoreChange);
}

function emitFlow() {
  flowListeners.forEach((listener) => listener());
}

function readFlowOpen(teamId: string) {
  return sessionStorage.getItem(flowKey(teamId)) === "open";
}

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
  const storedOpen = useSyncExternalStore(subscribeFlow, () => readFlowOpen(teamId), () => false);
  const open = settled ? false : storedOpen;
  const personalOpen = workspace.checklist.some(
    (item) => item.code === "PERSONAL_DATA" && (item.status === "todo" || item.status === "attention"),
  );

  function pause() {
    sessionStorage.setItem(flowKey(teamId), "paused");
    emitFlow();
  }

  function resume() {
    sessionStorage.setItem(flowKey(teamId), "open");
    emitFlow();
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
