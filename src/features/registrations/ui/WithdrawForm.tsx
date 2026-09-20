"use client";

import { withdrawRegistrationAction } from "@/features/registrations/actions";
import { PendingSubmitButton } from "@/shared/ui/PendingSubmitButton";
import { it } from "@/shared/i18n/it";

export function WithdrawForm({ registrationId }: { registrationId: string }) {
  return (
    <form action={withdrawRegistrationAction}>
      <input type="hidden" name="registrationId" value={registrationId} />
      <PendingSubmitButton idle={it.withdraw} pendingLabel={it.withdrawing} variant="danger" />
    </form>
  );
}
