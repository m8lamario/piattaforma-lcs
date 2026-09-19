import { revokeInviteAction } from "@/features/teams/actions";
import { Button } from "@/shared/ui/Button";
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
  PENDING: "In attesa",
  ACCEPTED: "Accettato",
  EXPIRED: "Scaduto",
  REVOKED: "Annullato",
};

export function InviteList({ teamId, invites }: { teamId: string; invites: Invite[] }) {
  return (
    <section className={styles.list}>
      <h2>{it.pendingInvites}</h2>
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
            <p className={styles.status}>{STATUS_LABEL[invite.status] ?? invite.status}</p>
          </div>
          {invite.status === "PENDING" ? (
            <form action={revokeInviteAction}>
              <input type="hidden" name="teamId" value={teamId} />
              <input type="hidden" name="inviteId" value={invite.id} />
              <Button type="submit" variant="ghost">
                {it.revoke}
              </Button>
            </form>
          ) : null}
        </div>
      ))}
    </section>
  );
}
