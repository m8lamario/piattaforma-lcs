"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonVariant } from "@/shared/ui/Button";

type Props = {
  idle: string;
  pendingLabel: string;
  variant?: ButtonVariant;
};

export function PendingSubmitButton({ idle, pendingLabel, variant = "primary" }: Props) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : idle}
    </Button>
  );
}
