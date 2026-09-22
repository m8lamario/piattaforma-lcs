"use client";

import { useActionState } from "react";
import { resendInviteAction, revokeInviteAction } from "@/features/teams/actions";
import { Button } from "@/shared/ui/Button";
import { ActionError } from "@/shared/ui/ActionError";
import { PendingSubmitButton } from "@/shared/ui/PendingSubmitButton";
import { StatusChip, type StatusTone } from "@/shared/ui/StatusChip";
import { it } from "@/shared/i18n/it";
import styles from "./InviteForm.module.css";

type Invite = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  createdAt: Date;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: it.inviteStatusPending,
  ACCEPTED: it.inviteStatusAccepted,
  EXPIRED: it.inviteStatusExpired,
  REVOKED: it.inviteStatusRevoked,
};

const STATUS_TONE: Record<string, StatusTone> = {
  PENDING: "attention",
  ACCEPTED: "complete",
  EXPIRED: "neutral",
  REVOKED: "danger",
};

export function InviteList({ teamId, invites }: { teamId: string; invites: Invite[] }) {
  const [state, action, pending] = useActionState(resendInviteAction, undefined);

  return (
    <section className={styles.list}>
      <h2>{it.pendingInvites}</h2>
      {state?.redeemUrl ? (
        <div className={styles.success} role="status">
          <p>{it.inviteCreated}</p>
          <code className={styles.url}>{state.redeemUrl}</code>
        </div>
      ) : null}
      {state?.error ? <ActionError error={state.error} code={state.code} /> : null}
      {invites.length === 0 ? <p className={styles.empty}>{it.emptyInvites}</p> : null}
      {invites.map((invite) => (
        <div key={invite.id} className={styles.row}>
          <div>
            <strong>
              {invite.firstName || invite.lastName
                ? `${invite.firstName ?? ""} ${invite.lastName ?? ""}`.trim()
                : invite.email}
            </strong>
            <p className={styles.meta}>{invite.email}</p>
            <p className={styles.status}>
              <StatusChip tone={STATUS_TONE[invite.status] ?? "neutral"}>
                {STATUS_LABEL[invite.status] ?? invite.status}
              </StatusChip>
            </p>
          </div>
          {invite.status === "PENDING" || invite.status === "EXPIRED" ? (
            <div className={styles.actions}>
              <form action={action}>
                <input type="hidden" name="teamId" value={teamId} />
                <input type="hidden" name="inviteId" value={invite.id} />
                <Button type="submit" variant="ghost" icon="send" disabled={pending} aria-busy={pending}>
                  {pending ? it.resendingInvite : it.resendInvite}
                </Button>
              </form>
              {invite.status === "PENDING" ? (
                <form action={revokeInviteAction}>
                  <input type="hidden" name="teamId" value={teamId} />
                  <input type="hidden" name="inviteId" value={invite.id} />
                  <PendingSubmitButton
                    idle={it.revoke}
                    pendingLabel={it.loadingRevoke}
                    variant="danger"
                    icon="close"
                  />
                </form>
              ) : null}
            </div>
          ) : null}
        </div>
      ))}
    </section>
  );
}
