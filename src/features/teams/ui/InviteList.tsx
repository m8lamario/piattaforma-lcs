"use client";

import { useActionState, useState } from "react";
import { resendInviteAction, revokeInviteAction } from "@/features/teams/actions";
import { EmailDeliveryStatus } from "@/features/emails/ui/EmailDeliveryStatus";
import type { UserEmailDeliveryState } from "@/features/emails/domain/delivery";
import { Avatar } from "@/shared/ui/Avatar";
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
  deliveryState: UserEmailDeliveryState;
  remainingResends: number;
  contactSupport: boolean;
  resendAvailableAt: string | null;
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
  const [now] = useState(() => Date.now());
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <div className={styles.list}>
      {state?.redeemUrl ? (
        <div className={styles.success} role="status">
          <p>{it.inviteCreated}</p>
          <code className={styles.url}>{state.redeemUrl}</code>
        </div>
      ) : null}
      {state?.error ? <ActionError error={state.error} code={state.code} /> : null}
      {invites.length === 0 ? <p className={styles.empty}>{it.emptyInvites}</p> : null}
      {invites.length > 0 ? (
        <ul className={styles.rows}>
          {invites.map((invite) => {
            const waiting = invite.resendAvailableAt ? new Date(invite.resendAvailableAt).getTime() > now : false;
            const blocked =
              invite.deliveryState === "undeliverable" ||
              invite.remainingResends <= 0 ||
              invite.deliveryState === "sending" ||
              waiting;
            const name =
              invite.firstName || invite.lastName ? `${invite.firstName ?? ""} ${invite.lastName ?? ""}`.trim() : null;
            const open = invite.status === "PENDING" || invite.status === "EXPIRED";
            return (
              <li key={invite.id} className={styles.row}>
                <Avatar name={name ?? invite.email} size="sm" muted={!open && invite.status !== "ACCEPTED"} />
                <div className={styles.who}>
                  <strong>{name ?? invite.email}</strong>
                  {name ? <span className={styles.meta}>{invite.email}</span> : null}
                  {open ? (
                    <EmailDeliveryStatus
                      state={invite.deliveryState}
                      remainingResends={invite.remainingResends}
                      contactSupport={invite.contactSupport}
                      compact
                    />
                  ) : null}
                </div>
                <div className={styles.rowSide}>
                  <StatusChip tone={STATUS_TONE[invite.status] ?? "neutral"}>
                    {STATUS_LABEL[invite.status] ?? invite.status}
                  </StatusChip>
                  {open ? (
                    <div className={styles.actions}>
                      <form action={action}>
                        <input type="hidden" name="teamId" value={teamId} />
                        <input type="hidden" name="inviteId" value={invite.id} />
                        <Button
                          type="submit"
                          variant="quiet"
                          icon="send"
                          disabled={pending || blocked}
                          aria-busy={pending}
                        >
                          {pending ? it.resendingInvite : it.resendInvite}
                        </Button>
                      </form>
                      {invite.status === "PENDING" && confirmId === invite.id ? (
                        <form action={revokeInviteAction} className={styles.confirm}>
                          <p>{it.revokeConfirm}</p>
                          <input type="hidden" name="teamId" value={teamId} />
                          <input type="hidden" name="inviteId" value={invite.id} />
                          <div className={styles.actions}>
                            <PendingSubmitButton
                              idle={it.revokeConfirmSubmit}
                              pendingLabel={it.loadingRevoke}
                              variant="danger"
                              icon="close"
                            />
                            <Button type="button" variant="ghost" onClick={() => setConfirmId(null)}>
                              {it.revokeKeep}
                            </Button>
                          </div>
                        </form>
                      ) : invite.status === "PENDING" ? (
                        <Button
                          type="button"
                          variant="dangerQuiet"
                          icon="close"
                          onClick={() => setConfirmId(invite.id)}
                        >
                          {it.revoke}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
