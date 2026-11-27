"use client";

import { useEffect, useSyncExternalStore } from "react";
import { PersonalDataForm } from "@/features/players/ui/PersonalDataForm";
import { PersonalRegistrationPanel } from "@/features/registrations/ui/PersonalRegistrationPanel";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import styles from "./RepresentativeDashboard.module.css";
import type { RepresentativeOwnRegistration } from "./representativeOwn";
import {
  readRepresentativeFlowOpen,
  resumeRepresentativeFlowFromLocation,
  subscribeRepresentativeFlow,
  writeRepresentativeFlow,
} from "./representativeFlow";

type Category = "PLAYER" | "STAFF";

type Props = {
  teamId: string;
  category: Category;
  own: RepresentativeOwnRegistration;
};

export function RepresentativeRegistration({ teamId, category, own }: Props) {
  const settled =
    own.projectedStatus === "WITHDRAWN" ||
    own.projectedStatus === "REMOVED" ||
    (own.projectedStatus === "APPROVED" && (category === "STAFF" || own.sportEligible));
  const storedOpen = useSyncExternalStore(
    subscribeRepresentativeFlow,
    () => readRepresentativeFlowOpen(teamId),
    () => false,
  );
  const open = settled ? false : storedOpen;

  useEffect(() => {
    resumeRepresentativeFlowFromLocation(teamId);
    const onHash = () => resumeRepresentativeFlowFromLocation(teamId);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [teamId]);
  const personalOpen = own.checklist.some(
    (item) => item.code === "PERSONAL_DATA" && (item.status === "todo" || item.status === "attention"),
  );

  const panel = (
    <PersonalRegistrationPanel
      status={own.projectedStatus}
      checklist={own.checklist}
      medicalStatus={own.medicalStatus}
      sportEligible={own.sportEligible}
      category={own.category}
      publication={own.publication}
      shirtSizeDue={own.shirtSizeOnlyGap}
    />
  );

  if (settled) return panel;

  if (!open) {
    return (
      <div className={styles.flowBar}>
        <p>{it.repRolePaused}</p>
        <Button type="button" variant="secondary" icon="chevronRight" iconPosition="right" onClick={() => writeRepresentativeFlow(teamId, "open")}>
          {it.repRoleResume}
        </Button>
      </div>
    );
  }

  if (personalOpen) {
    return (
      <PersonalDataForm
        email={own.email}
        defaults={own.profile}
        registrationId={own.registrationId}
        identityConflict={own.identityConflict}
        requireShirtSize={category === "PLAYER"}
        returnToArea
        onPause={() => writeRepresentativeFlow(teamId, "paused")}
      />
    );
  }

  return (
    <div className={styles.flowStack}>
      <div className={styles.flowBar}>
        <p>{it.repRoleStepsOpen}</p>
        <Button type="button" variant="quiet" onClick={() => writeRepresentativeFlow(teamId, "paused")}>
          {it.repRolePause}
        </Button>
      </div>
      {panel}
    </div>
  );
}
