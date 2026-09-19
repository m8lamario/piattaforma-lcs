-- Pending invites: one active invite per email per team
CREATE UNIQUE INDEX "PlayerInvite_pending_team_email_key"
ON "PlayerInvite" ("teamId", "email")
WHERE "status" = 'PENDING';
