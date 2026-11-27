"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  revokeAiApprovalAction,
  type RevokeAiApprovalSuccess,
} from "@/features/documents/actions";
import type { ReviewQueueFilters } from "@/features/documents/domain/reviewQueue";
import { ActionError } from "@/shared/ui/ActionError";
import { PendingSubmitButton } from "@/shared/ui/PendingSubmitButton";
import type { ActionFailure } from "@/shared/errors";
import { it } from "@/shared/i18n/it";
import styles from "./ReviewForm.module.css";

type Props = {
  documentId: string;
  filters?: ReviewQueueFilters;
  onSuccess?: (result: RevokeAiApprovalSuccess) => void;
};

function isSuccess(state: unknown): state is RevokeAiApprovalSuccess {
  if (!state || typeof state !== "object" || !("ok" in state)) return false;
  const value = state as RevokeAiApprovalSuccess;
  return value.ok === true && Boolean(value.document) && Array.isArray(value.queue);
}

function isFailure(state: unknown): state is ActionFailure {
  return Boolean(state && typeof state === "object" && "error" in state);
}

export function RevokeAiApprovalForm({ documentId, filters, onSuccess }: Props) {
  const [state, action] = useActionState(revokeAiApprovalAction, undefined);
  const handled = useRef<unknown>(null);

  useEffect(() => {
    if (!isSuccess(state) || handled.current === state) return;
    handled.current = state;
    onSuccess?.(state);
  }, [onSuccess, state]);

  return (
    <form action={action} className={styles.stack}>
      <input type="hidden" name="documentId" value={documentId} />
      {filters?.teamId ? <input type="hidden" name="teamId" value={filters.teamId} /> : null}
      {filters?.q ? <input type="hidden" name="queueQ" value={filters.q} /> : null}
      {filters?.editionId ? <input type="hidden" name="editionId" value={filters.editionId} /> : null}
      {filters?.schoolId ? <input type="hidden" name="schoolId" value={filters.schoolId} /> : null}
      {filters?.requiredKind ? <input type="hidden" name="requiredKind" value={filters.requiredKind} /> : null}
      {filters?.status ? <input type="hidden" name="queueStatus" value={filters.status} /> : null}
      {filters?.anomaly ? <input type="hidden" name="anomaly" value={filters.anomaly} /> : null}
      {filters?.aiReview ? <input type="hidden" name="aiReview" value={filters.aiReview} /> : null}
      <p className={styles.help}>{it.adminRevokeAiHelp}</p>
      {isFailure(state) ? <ActionError error={state.error} code={state.code} /> : null}
      <PendingSubmitButton idle={it.adminRevokeAiApproval} pendingLabel={it.saving} variant="secondary" />
    </form>
  );
}
